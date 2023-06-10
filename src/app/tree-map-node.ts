import { TreemapLayout } from "d3";
import { Changelog, Diff, diffs_to_changelog } from './extras';

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
  color_l: number
}

export function TreeConversion(tree_root: any): TreeMapNode {

  if (tree_root.hasOwnProperty("children")) {
    let ch = tree_root.children.map(c => { return TreeConversion(c); }); //decorate_tree_partition(children[i], sofar, sofar + values[i])
    ch = ch.sort((a, b) => { return a.name.localeCompare(b.value); })
    if (tree_root.hasOwnProperty("time"))
      return { name: tree_root.time, value: tree_root.total_value, hash: tree_root.hash, lim_min: tree_root.lim_min, lim_max: tree_root.lim_max, children: ch, leaf: false } as TreeMapNode;
    else
      return { name: tree_root.name, value: tree_root.total_value, hash: tree_root.hash, lim_min: tree_root.lim_min, lim_max: tree_root.lim_max, children: ch, leaf: false } as TreeMapNode;
  }
  else
    return { name: tree_root.name, value: tree_root.value, hash: tree_root.hash, lim_min: tree_root.lim_min, lim_max: tree_root.lim_max, children: [], leaf: true } as TreeMapNode;


}


export function SliceAndDiceTreeMapCont(tree: TreeMapNode, tree_ref: TreeMapNode, parent_division: any): RectNode[] {
  if (tree.leaf)
    return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (tree.lim_max + tree.lim_min) / 2) + 60) % 360, color_s: 50, color_l: 50 } as RectNode]
  else {
    let start, end, new_slice;
    if (parent_division.slice == 0) {
      start = parent_division.x0;
      end = parent_division.x1;
      new_slice = 1;
    }
    else {
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
        arr = arr.concat(SliceAndDiceTreeMapCont(c, tree_ref, { x0: start + so_far, x1: start + so_far + delta, y0: parent_division.y0, y1: parent_division.y1, slice: new_slice }))

      if (parent_division.slice == 1)
        arr = arr.concat(SliceAndDiceTreeMapCont(c, tree_ref, { x0: parent_division.x0, x1: parent_division.x1, y0: start + so_far, y1: start + so_far + delta, slice: new_slice }))
      so_far += delta;
    }
    return arr;
  }

}

export function SliceAndDiceTreeMap(tree: TreeMapNode, parent_division: any): RectNode[] {
  if (tree.leaf)
    return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (tree.lim_max + tree.lim_min) / 2) + 60) % 360, color_s: 50, color_l: 50 } as RectNode]
  else {
    let start, end, new_slice;
    if (parent_division.slice == 0) {
      start = parent_division.x0;
      end = parent_division.x1;
      new_slice = 1;
    }
    else {
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
        arr = arr.concat(SliceAndDiceTreeMap(c, { x0: start + so_far, x1: start + so_far + delta, y0: parent_division.y0, y1: parent_division.y1, slice: new_slice }))

      if (parent_division.slice == 1)
        arr = arr.concat(SliceAndDiceTreeMap(c, { x0: parent_division.x0, x1: parent_division.x1, y0: start + so_far, y1: start + so_far + delta, slice: new_slice }))
      so_far += delta;
    }
    return arr;
  }

}

export function BuildTreeMap(tree: TreeMapNode, type: string, parent_division: any): RectNode[] {
  if (tree.leaf)
    return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (tree.lim_max + tree.lim_min) / 2) + 60) % 360, color_s: 50, color_l: 50 } as RectNode]
  else {
    let start, end, new_slice;
    if (parent_division.slice == 0) {
      start = parent_division.x0;
      end = parent_division.x1;
      new_slice = 1;
    }
    else {
      start = parent_division.y0;
      end = parent_division.y1;
      new_slice = 0;
    }

    let arr: RectNode[] = [];
    let val = tree.children.reduce((pv, ch) => { return pv + ch.value; }, 0);
    let so_far = 0;
    let idx = tree.children.map((el, id) => { return {v: el.value, id: id}}).sort((a,b)=>{return a.v-b.v;});
    for (let i = 0 ; i < tree.children.length; i++) {
      let c = tree.children[idx[i].id];

      let delta = (c.value / val) * (end - start);
      if (parent_division.slice == 0)
        arr = arr.concat(BuildTreeMap(c, type, { x0: start + so_far, x1: start + so_far + delta, y0: parent_division.y0, y1: parent_division.y1, slice: new_slice }))

      if (parent_division.slice == 1)
        arr = arr.concat(BuildTreeMap(c, type, { x0: parent_division.x0, x1: parent_division.x1, y0: start + so_far, y1: start + so_far + delta, slice: new_slice }))
      so_far += delta;
    }
    return arr;
  }
}

export function get_layout_names(): any[] {
  return [{ DisplayName: "Slice & dice horizontal", Description: "Slice and dice algorithm starting with horizontal division." },
  { DisplayName: "Slice & dice vertical", Description: "Slice and dice algorithm starting with vertical division." }];
}

export function data_to_rectangles(trees: TreeMapNode[], layout: string): RectNode[][] {

  let changelogs: any[] = [];
  for (let i = 0; i < trees.length - 1; i++) {
    let diff = TreeDiff_1(trees[i], trees[i + 1], [], []);
    let changelog: Changelog[] = diffs_to_changelog(diff);
    changelogs.push(changelog);
  }

  let unique_names = new Set<string>();
  let rectangles: RectNode[][] = [];

  // build treemap and get list of names
  for (let i = 0; i < trees.length; ++i) {
    rectangles.push(BuildTreeMap(trees[i], "", { x0: 0, x1: 100, y0: 0, y1: 100, slice: 0 }));
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

    for (let n in to_add)
      rectangles[i].push({ name: n, value: 0, x0: 0, x1: 0, y0: 0, y1: 0, color: "white", color_h: 0, color_s: 0, color_l: 100 } as RectNode);

  }

  // sort by name
  for (let i = 0; i < rectangles.length; i++)
    rectangles[i] = rectangles[i].sort((a, b) => { return a.name.localeCompare(b.name); });

  return rectangles;
}

export function TreeDiff_1(t1: TreeMapNode, t2: TreeMapNode, path: string[], diff: any[]) {

  if (t1.leaf && t2.leaf)
    return diff;
  if (t1.hash != t2.hash) {
    if (!t1.children[0].leaf) {
      for (let i = 0; i < t1.children.length; i++) {
        if (t1.children[i].hash != t2.children[i].hash) {
          let path_new = [...path];
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
