import { TreemapLayout, partition } from "d3";
import { Changelog, Diff, decorate_tree, diffs_to_changelog } from './extras';
import { order } from "@amcharts/amcharts4/.internal/core/utils/Number";
import { TreeMap } from "@amcharts/amcharts4/charts";
import { slice } from "@amcharts/amcharts4/.internal/core/utils/Array";
import * as d3 from "d3";
import { BuildSpiral, BuildSpiralCont } from "./treemap-builder/spiral";
import { BuildSquarify } from "./treemap-builder/squarify";
import { SliceAndDiceAutoCont, SliceAndDiceTreeMapCont } from "./treemap-builder/slice-and-dice";
import { LayoutType } from "src/layout-settings";

export enum Change {
  None = 0,
  Move = 1,
  Create = 2,
  Delete = 3
}

export interface TreeMapNode {
  name: string,
  value: number,
  hash: string,
  lim_min: number,
  lim_max: number,
  children: TreeMapNode[]
  leaf: boolean
}

export interface RectNode {
  name: string,
  value: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number
  color: string,
  color_h: number,
  color_s: number,
  color_l: number,
  color_a: number,
  transition?: Change,
  path?: string[]
}

export function IsIn(arr: any[], predicate) {
  return arr.filter(predicate).length > 0;
}

/**
 * compute the aspect ratio and inverts it if < 1.
 * @param w width
 * @param h height
 * @returns the aspect ratio >= 1
 */
export function ratio(w: number, h: number) {
  let x = w/h;
  return x > 1 ? x : 1 / x;
}

/**
 * convert unstructured tree data from the server into typescript-friendly format (all nodes will be treated the same)
 * @param data
 * @returns
 */
export function raw_data_to_trees(data: any): [TreeMapNode[], number[]] {
  let d = data.map(
    (el) => { return { time: el.time, ...decorate_tree(el) }; } //add new field (time) to object
  )
    .map(
      (el) => { return TreeConversion(el); }
    )

  let timesteps = data.map(el => {
    return el.time;
  });

  return [d, timesteps];

}

/**
 *
 * @param tree_root
 * @returns
 */
/**
 * Converts a tree structure into a TreeMapNode structure.
 * @param tree_root - The root node of the tree structure to be converted.
 * @returns The converted TreeMapNode structure.
 */
export function TreeConversion(tree_root: any): TreeMapNode {
  // Check if the tree node has children
  if (tree_root.hasOwnProperty("children")) {
    // Convert each child recursively and store them in 'ch' array
    let ch = tree_root.children.map(c => { return TreeConversion(c); });

    // Sort the 'ch' array based on the 'name' property of each TreeMapNode
    ch = ch.sort((a, b) => { return a.name.localeCompare(b.value); });

    // Check if the tree node has 'time' property
    if (tree_root.hasOwnProperty("time"))
      return {
        name: tree_root.time,
        value: tree_root.total_value,
        hash: tree_root.hash,
        lim_min: tree_root.lim_min,
        lim_max: tree_root.lim_max,
        children: ch,
        leaf: false
      } as TreeMapNode;
    else
      return {
        name: tree_root.name,
        value: tree_root.total_value,
        hash: tree_root.hash,
        lim_min: tree_root.lim_min,
        lim_max: tree_root.lim_max,
        children: ch,
        leaf: false
      } as TreeMapNode;
  }
  else {
    // If the tree node doesn't have children, create a leaf TreeMapNode
    return {
      name: tree_root.name,
      value: tree_root.value,
      hash: tree_root.hash,
      lim_min: tree_root.lim_min,
      lim_max: tree_root.lim_max,
      children: [],
      leaf: true
    } as TreeMapNode;
  }
}

/**
 * Generates a slice-and-dice tree map visualization.
 * @param tree - The root node of the input tree structure.
 * @param parent_division - The division coordinates of the parent node.
 * @returns An array of RectNode objects representing the tree map visualization.
 */
export function SliceAndDiceTreeMap(tree: TreeMapNode, parent_division: any): RectNode[] {
  if (tree.leaf) {
    // Base case: If the current node is a leaf node, return a single RectNode representing the leaf.
    return [{
      name: tree.name,
      value: tree.value,
      x0: parent_division.x0,
      x1: parent_division.x1,
      y0: parent_division.y0,
      y1: parent_division.y1,
      color: "#fff000",
      color_h: (Math.round(360 * (tree.lim_max + tree.lim_min) / 2) + 60) % 360,
      color_s: 50,
      color_l: 40,
      color_a: 1.0,
      transition: Change.None
    } as RectNode];
  } else {
    // Recursive case: Divide and process child nodes.

    let start, end, new_slice;
    if (parent_division.slice == 0) {
      start = parent_division.x0;
      end = parent_division.x1;
      new_slice = 1;
    } else {
      start = parent_division.y0;
      end = parent_division.y1;
      new_slice = 0;
    }

    let arr: RectNode[] = [];
    let val = tree.children.reduce((pv, ch) => { return pv + ch.value; }, 0);
    let so_far = 0;

    for (let i = 0; i < tree.children.length; i++) {
      let c = tree.children[i];

      let delta = (c.value / val) * (end - start);

      if (parent_division.slice == 0)
        arr = arr.concat(SliceAndDiceTreeMap(c, { x0: start + so_far, x1: start + so_far + delta, y0: parent_division.y0, y1: parent_division.y1, slice: new_slice }));

      if (parent_division.slice == 1)
        arr = arr.concat(SliceAndDiceTreeMap(c, { x0: parent_division.x0, x1: parent_division.x1, y0: start + so_far, y1: start + so_far + delta, slice: new_slice }));

      so_far += delta;
    }
    return arr;
  }
}

/**
 * Generates a tree map visualization based on the input tree.
 * 
 * @param {TreeMapNode} tree - The input tree object.
 * @param {string} type - The type of tree map.
 * @param {any} parent_division - The division information of the parent node.
 * @returns {RectNode[]} - An array of rectangle nodes representing the tree map.
 */
export function BuildTreeMap(tree: TreeMapNode, type: string, parent_division: any): RectNode[] {
  if (tree.leaf) {
    // Base case: If the current node is a leaf node, return a rectangle node representing it
    return [{
      name: tree.name,
      value: tree.value,
      x0: parent_division.x0,
      x1: parent_division.x1,
      y0: parent_division.y0,
      y1: parent_division.y1,
      color: "#fff000",
      color_h: (Math.round(360 * (tree.lim_max + tree.lim_min) / 2) + 60) % 360,
      color_s: 50,
      color_l: 50,
      color_a: 1.0,
      transition: Change.None
    } as RectNode];
  } else {
    // Recursive case: If the current node is not a leaf node
    let start, end, new_slice;
    if (parent_division.slice == 0) {
      start = parent_division.x0;
      end = parent_division.x1;
      new_slice = 1;
    } else {
      start = parent_division.y0;
      end = parent_division.y1;
      new_slice = 0;
    }

    let arr: RectNode[] = [];
    let val = tree.children.reduce((pv, ch) => { return pv + ch.value; }, 0);
    let so_far = 0;
    let idx = tree.children.map((el, id) => { return { v: el.value, id: id } }).sort((a, b) => { return a.v - b.v; });

    for (let i = 0; i < tree.children.length; i++) {
      let c = tree.children[idx[i].id];
      let delta = (c.value / val) * (end - start);

      if (parent_division.slice == 0)
        arr = arr.concat(BuildTreeMap(c, type, {
          x0: start + so_far,
          x1: start + so_far + delta,
          y0: parent_division.y0,
          y1: parent_division.y1,
          slice: new_slice
        }));

      if (parent_division.slice == 1)
        arr = arr.concat(BuildTreeMap(c, type, {
          x0: parent_division.x0,
          x1: parent_division.x1,
          y0: start + so_far,
          y1: start + so_far + delta,
          slice: new_slice
        }));

      so_far += delta;
    }
    return arr;
  }
}
/**
 * Returns an array of layout names along with their display names and descriptions.
 * @returns An array of objects containing layout information.
 */
export function get_layout_names(): any[] {
  return [
    { 
      Name: "s&d_h", 
      DisplayName: "Slice & dice horizontal", 
      Description: "Slice and dice algorithm starting with horizontal division." 
    },
    { 
      Name: "s&d_v", 
      DisplayName: "Slice & dice vertical", 
      Description: "Slice and dice algorithm starting with vertical division." 
    },
    { 
      Name: "s&d_auto", 
      DisplayName: "Slice & dice automatic", 
      Description: "Slice and dice algorithm where slicing and dicing is done based on viewport ratio." 
    },
    { 
      Name: "sq_max", 
      DisplayName: "Squarify (maximum)", 
      Description: "Greedy squarify algorithm (minimum of ratio)." 
    },
    { 
      Name: "sq_mean", 
      DisplayName: "Squarify (mean)", 
      Description: "Greedy squarify algorithm (average ratio)." 
    },
    { 
      Name: "spa", 
      DisplayName: "Spiral ascending", 
      Description: "Spiral arrangement where nodes are placed in ascending order." 
    },
    { 
      Name: "spd", 
      DisplayName: "Spiral descending", 
      Description: "Spiral arrangement where nodes are placed in descending order." 
    },
    { 
      Name: "spa_cont", 
      DisplayName: "Spiral ascending continuous", 
      Description: "Spiral arrangement where nodes are placed in ascending order. Time continuous version." 
    },
    { 
      Name: "spd_cont", 
      DisplayName: "Spiral descending continuous", 
      Description: "Spiral arrangement where nodes are placed in descending order. Time continuous version." 
    }
  ];
}

/**
 * Converts tree data into rectangles using a specified layout algorithm.
 *
 * @param trees - Array of trees for different timesteps.
 * @param layout - Layout type to be used for generating rectangles.
 * @param width - Width of the rectangle container.
 * @param height - Height of the rectangle container.
 * @param reference_tree_index - Index of the reference tree in the trees array (default: 0).
 * @returns An array containing the generated rectangles and the changelogs for each timestep.
 */
export function data_to_rectangles(trees: TreeMapNode[], layout: LayoutType, width: number, height: number, reference_tree_index: number = 0): [RectNode[][], Changelog[][]] {

  if(reference_tree_index < 0)
    reference_tree_index = 0;
  if(reference_tree_index >= trees.length)
    reference_tree_index = trees.length;

  let changelogs: any[] = [];
  console.log(trees);
  for (let i = 0; i < trees.length - 1; i++) {
    let diff = TreeDiff_1(trees[i], trees[i + 1], [], []);
    let changelog: Changelog[] = diffs_to_changelog(diff);
    changelogs.push(changelog);
  }

  let unique_names = new Set<string>();
  let rectangles: RectNode[][] = [];

  // build treemap and get list of names
  for (let i = 0; i < trees.length; ++i) {
    if (layout == LayoutType.SQ_MAX)
      rectangles.push(BuildSquarify(trees[i], trees[reference_tree_index], { x0: 0, x1: width, y0: 0, y1: height, x0r: 0, x1r: width, y0r: 0, y1r: height, cmin: 0, cmax: 1 }, "max"));
    if (layout == LayoutType.SQ_MEAN)
      rectangles.push(BuildSquarify(trees[i], trees[reference_tree_index], { x0: 0, x1: width, y0: 0, y1: height, x0r: 0, x1r: width, y0r: 0, y1r: height, cmin: 0, cmax: 1 }, "mean"));
    if (layout == LayoutType.SD_H)
      rectangles.push(SliceAndDiceTreeMapCont(trees[i], trees[reference_tree_index], { x0: 0, x1: width, y0: 0, y1: height, slice: 1, cmin: 0, cmax: 1 }));
    if (layout == LayoutType.SD_V)
      rectangles.push(SliceAndDiceTreeMapCont(trees[i], trees[reference_tree_index], { x0: 0, x1: width, y0: 0, y1: height, slice: 0, cmin: 0, cmax: 1 }));
    if (layout == LayoutType.SD_A)
      rectangles.push(SliceAndDiceAutoCont(trees[i], trees[reference_tree_index], { x0: 0, x1: width, y0: 0, y1: height, x0r: 0, x1r: width, y0r: 0, y1r: height, slice: 0, cmin: 0, cmax: 1 }));
    if (layout == LayoutType.SP_ASC)
      rectangles.push(BuildSpiral(trees[i], 0, width, 0, height, 0, 1, true));
    if (layout == LayoutType.SP_DES)
      rectangles.push(BuildSpiral(trees[i], 0, width, 0, height, 0, 1, false));
    if (layout == LayoutType.SP_ASC_CONT)
      rectangles.push(BuildSpiralCont(trees[i], trees[reference_tree_index], 0, width, 0, height, 0, 1, true, 0, width, 0, height));
    if (layout == LayoutType.SP_DES_CONT)
      rectangles.push(BuildSpiralCont(trees[i], trees[reference_tree_index], 0, width, 0, height, 0, 1, false, 0, width, 0, height));
    //rectangles.push(BuildTreeMap(trees[i], "", { x0: 0, x1: 100, y0: 0, y1: 100, slice: 0 }));
    rectangles[i].map(el => { unique_names.add(el.name); });
  }

  //console.log(unique_names)
  // add unique names
  for (let i = 0; i < trees.length; ++i) {
    let to_add: string[] = [];
    unique_names.forEach((el) => {
      if (rectangles[i].filter((r) => { return r.name == el; }).length == 0)
        to_add.push(el);
    });

    for (let n of to_add) {

      rectangles[i].push({ name: n, value: 0, x0: 0, x1: 0, y0: 0, y1: 0, color: "white", color_h: 0, color_s: 0, color_l: 100, color_a: 0.0, transition: Change.None } as RectNode);
    }
  }

  // sort by name
  for (let i = 0; i < rectangles.length; i++)
    rectangles[i] = rectangles[i].sort((a, b) => { return a.name.localeCompare(b.name); });



  for (let i = 1; i < rectangles.length; i++) {
    for (let k = 0; k < rectangles[i].length; k++) {
      let filtered = changelogs[i - 1].filter((el) => { return el.Name == rectangles[i][k].name; });

      if (filtered.length > 0) {
        if (filtered[0].Type == "Create") {
          console.log("CREATE ", rectangles[i - 1][k].name, rectangles[i][k].name)
          //between i-1 and i, the k-th rectangle appeared
          rectangles[i - 1][k].color_l = 100;
          rectangles[i - 1][k].y0 = 0;
          rectangles[i - 1][k].y1 = 1;
          rectangles[i][k].transition = Change.Create;


        }
        else if (filtered[0].Type == "Delete") {
          console.log("DELETE ", rectangles[i - 1][k].name, rectangles[i][k].name)
          // something disappeared between i-1 and i.
          rectangles[i][k].color_l = 0;
          rectangles[i][k].color_s = 100;
          rectangles[i][k].transition = Change.Delete;

        }
        else if (filtered[0].Type == "Move") {
          console.log("MOVE ", rectangles[i - 1][k].name, rectangles[i][k].name)
          rectangles[i][k].transition = Change.Move;
        }
      }
    }

  }

  return [rectangles, changelogs];

}

/**
 * Finds structural differences using hash-based algorithm
 * @param t1 treemap1
 * @param t2 treemap2
 * @param path explored list of nodes
 * @param diff differences found so far
 * @returns
 */
export function TreeDiff_1(t1: TreeMapNode, t2: TreeMapNode, path: string[], diff: any[]) {

  if (t1.leaf && t2.leaf)
    return diff;
  if (t1.hash != t2.hash) {
    if (!t1.children[0].leaf) {
      for (let i = 0; i < t1.children.length; i++) {
        if (t1.children[i].hash != t2.children[i].hash) {
          let path_new = [...path]; //copy
          path_new.push(t1.children[i].name);

          TreeDiff_1(t1.children[i], t2.children[i], path_new, diff);
        }
      }
    }
    else {
      let s1 = t1.children.map(c => { return c.name; });
      let s2 = t2.children.map(c => { return c.name; });

      let diff12 = s1.filter(x => !s2.includes(x));
      let diff21 = s2.filter(x => !s1.includes(x));

      for (var leaf of diff12) {
        diff.push({ Path: path, LeafName: leaf, Type: -1 } as Diff);
      }
      //diff.push(["-", leaf.name, ...path]);
      for (var leaf of diff21)
        diff.push({ Path: path, LeafName: leaf, Type: 1 } as Diff);
      // diff.push(["+", leaf.name, ...path]);
      //console.log(JSON.stringify(path), diff12, diff21);
    }
    return diff;

  }
  else
    return diff;

}


