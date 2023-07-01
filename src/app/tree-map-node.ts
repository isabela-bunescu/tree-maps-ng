import { TreemapLayout, partition } from "d3";
import { Changelog, Diff, decorate_tree, diffs_to_changelog } from './extras';
import { order } from "@amcharts/amcharts4/.internal/core/utils/Number";
import { TreeMap } from "@amcharts/amcharts4/charts";
import { slice } from "@amcharts/amcharts4/.internal/core/utils/Array";

export enum Change{
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
  transition?: Change
}

function IsIn(arr: any[], predicate){
  return arr.filter(predicate).length > 0;
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

/**
 *
 * @param tree
 * @param tree_ref initial tree which the topology is based on
 * @param parent_division
 * @returns
 */
export function SliceAndDiceTreeMapCont(tree: TreeMapNode, tree_ref: TreeMapNode, parent_division: any): RectNode[] {
  if (tree.leaf)
    return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (parent_division.cmin + parent_division.cmax) / 2) + 300) % 360, color_s: 50, color_l: 40, color_a: 1.0 , transition: Change.None} as RectNode]
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

    let ordered = tree_ref.children.map(el => { return { value: el.value, name: el.name }; });

    ordered = ordered.filter((el) => {
      return tree.children.filter(el2 => {
        return el2.name == el.name;
      }).length > 0;
    });

    ordered = ordered.concat(tree.children.filter(el => {
      return ordered.filter(el2 => { return el.name == el2.name; }).length == 0;
    })
      .map(el => { return { value: el.value, name: el.name }; }));

    ordered = ordered.sort((a, b) => { return a.value - b.value; });
    let cstart = parent_division.cmin;

    for (let o of ordered) {
      let c = tree.children.find(el => { return el.name == o.name; }) as TreeMapNode;
      let tr = tree_ref.children.find(el => { return el.name == o.name; }) as TreeMapNode;
      //for (let i = 0; i < tree.children.length; i++) {
      //let c = tree.children[i];

      let delta = (c.value / val) * (end - start);
      let delta_c = c.value / val * (parent_division.cmax - parent_division.cmin)

      if (parent_division.slice == 0)
        arr = arr.concat(SliceAndDiceTreeMapCont(c, tr, { x0: start + so_far, x1: start + so_far + delta, y0: parent_division.y0, y1: parent_division.y1, slice: new_slice, cmin: cstart, cmax: cstart + delta_c }))

      if (parent_division.slice == 1)
        arr = arr.concat(SliceAndDiceTreeMapCont(c, tr, { x0: parent_division.x0, x1: parent_division.x1, y0: start + so_far, y1: start + so_far + delta, slice: new_slice, cmin: cstart, cmax: cstart + delta_c }))
      so_far += delta;
      cstart += delta_c;
    }
    return arr;
  }

}

export function SliceAndDiceTreeMap(tree: TreeMapNode, parent_division: any): RectNode[] {
  if (tree.leaf)
    return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (tree.lim_max + tree.lim_min) / 2) + 60) % 360, color_s: 50, color_l: 40, color_a: 1.0, transition: Change.None} as RectNode]
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

export function BuildSquarify(tree: TreeMapNode, tree_ref: TreeMapNode, parent_division: any): RectNode[] {
  if (tree.leaf)
   return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (parent_division.cmin + parent_division.cmax) / 2) + 60) % 360, color_s: 50, color_l: 40, color_a: 1.0, transition: Change.None } as RectNode]
  else {

    let arr: RectNode[] = [];

    let slice_dimension = 0;
    if(parent_division.y1r-parent_division.y0r > parent_division.x1r - parent_division.x0r)
      slice_dimension = 1;

    let val = tree.children.reduce((pv, ch) => { return pv + ch.value; }, 0);
    //let val_ref = tree_ref.children.reduce((pv, ch) => { return pv + ch.value; }, 0);

    let so_far = 0;
    let ratio = (x) => {return x > 1 ? x : 1/x; }

    let idx = tree_ref.children.map((el, id) => { return { v: el.value, id: id, n: el.name }; });
    // add if something is to add

    idx = idx.concat(
       tree.children.filter((el) => {
                      return !IsIn(idx, (e2)=>{return e2.n == el.name;})
                    })
                    .map((el, id) => {
                      return { v: el.value, id: id, n: el.name };
                    }));
    // delete if something needs to be deleted
    idx = idx.filter((el) => { return IsIn(tree.children, (e2)=>{return el.n.localeCompare(e2.name) == 0;})});
    // sort the indices
    idx = idx.sort((b, a) => { return a.v - b.v; });

    //let explored: number[] = [];
    let frontier: any[] = [];
    let to_explore: any[] = idx.map((el)=>{return {name: el.n, value: el.v};});

    let val_ref = idx.reduce((pv, el) => pv+el.v, 0);

    let X0 = parent_division.x0;
    let X1 = parent_division.x1;
    let Y0 = parent_division.y0;
    let Y1 = parent_division.y1;
    let X0r = parent_division.x0r;
    let X1r = parent_division.x1r;
    let Y0r = parent_division.y0r;
    let Y1r = parent_division.y1r;

    let previous_ratio = Infinity;
    let total_ratio = 0;
    let cstart = parent_division.cmin;

    let value_so_far: number = 0;
    let value_so_far_reference: number = 0;

    while(to_explore.length > 0){

      // try add on a horizontal group
      if(slice_dimension == 0){
        frontier.push(to_explore[0]);
        to_explore.shift();
        let total_value_frontier = frontier.reduce((pv,el) => pv+el.value, 0); // frontier.reduce((pv, el) => {return pv+tree.children.find(e => e.name == el.name)!.value;}, 0);
        let width = total_value_frontier/(val_ref-value_so_far_reference)*(X1r-X0r);
        //let mean_ratio = frontier.reduce((pv, el) => { return pv+ratio((tree.children.find(e => e.name == el.name)!.value/total_value_frontier)*(Y1-Y0)/width); }, 0)
        let mean_ratio = frontier.reduce((pv, el) => pv+ratio(el.value/total_value_frontier*(Y1r-Y0r)/width), 0);
        mean_ratio /= frontier.length;
        //console.log(mean_ratio, previous_ratio, mean_ratio <= previous_ratio)
        if(mean_ratio <= previous_ratio && to_explore.length > 0)
          previous_ratio = mean_ratio;
        else
        {

          if(previous_ratio < mean_ratio)
          {
            let tmp = frontier.pop();
            to_explore.unshift(tmp as string);
          }

          // compute new available space
          let total_value_frontier_ref = frontier.reduce((pv,el) => pv+el.value, 0);
          let total_value_frontier = frontier.reduce((pv, el) => {return pv+tree.children.find(e => e.name == el.name)!.value;}, 0);
          let width = total_value_frontier/(val-value_so_far)*(X1-X0);
          let width_ref = total_value_frontier_ref/(val_ref - value_so_far_reference)*(X1r-X0r);

          so_far = Y0;
          let so_far_ref = Y0r;
          for(let idx of frontier){
            let nme = idx.name;
            let c = tree.children.find(ch => ch.name == nme) as TreeMapNode;
            let cr = tree_ref.children.find(ch => ch.name == nme) as TreeMapNode;

            //console.log(cr.name, c.name);

            let delta_c = (c.value / val) * (parent_division.cmax - parent_division.cmin);
            let delta = (c.value / total_value_frontier) * (Y1 - Y0);
            let delta_ref = (idx.value / total_value_frontier_ref) * (Y1r - Y0r);
            arr = arr.concat(BuildSquarify(c, cr, { x0: X0 , x1: X0+width, y0: so_far, y1: so_far+delta, x0r: X0r, x1r: X0r+width_ref, y0r: so_far_ref, y1r: so_far_ref+delta_ref, cmin: cstart, cmax: cstart + delta_c }));
            cstart += delta_c;
            so_far += delta;
            so_far_ref += delta_ref;
          }
          X0 += width;
          X0r += width_ref;
          value_so_far += total_value_frontier;
          value_so_far_reference += total_value_frontier_ref;

          // decide where to slice next
          slice_dimension = 1;
          if(Y1r-Y0r < X1r - X0r)
            slice_dimension = 0;
          previous_ratio = Infinity;

          frontier = [];
        }
      }
      else{
        // slicing the other way
        frontier.push(to_explore[0]);
        to_explore.shift();
        let total_value_frontier = frontier.reduce((pv,el) => pv+el.value, 0); //frontier.reduce((pv, el) => {return pv+tree.children.find(e => e.name == el.name)!.value;}, 0);
        let height = total_value_frontier/(val_ref-value_so_far_reference)*(Y1r-Y0r);
        //let mean_ratio = frontier.reduce((pv, el) => { return pv+ratio((tree.children.find(e => e.name == el.name)!.value/total_value_frontier)*(X1-X0)/height); }, 0)
        let mean_ratio = frontier.reduce((pv, el) => pv+ratio(el.value/total_value_frontier*(X1r-X0r)/height), 0);
        mean_ratio /= frontier.length;

        if(mean_ratio <= previous_ratio && to_explore.length > 0)
          previous_ratio = mean_ratio;
        else
        {
          if(previous_ratio < mean_ratio)
          {
            let tmp = frontier.pop();
            to_explore.unshift(tmp as string);
          }

          // compute new available space
          let total_value_frontier = frontier.reduce((pv, el) => {return pv+tree.children.find(e => e.name == el.name)!.value;}, 0);
          let total_value_frontier_ref = frontier.reduce((pv,el) => pv+el.value, 0);
          let height = total_value_frontier/(val-value_so_far)*(Y1-Y0);
          let height_ref = total_value_frontier_ref/(val_ref-value_so_far_reference)*(Y1-Y0);

          so_far = X0;
          let so_far_ref = X0r;

          for(let idx of frontier){
            let nme = idx.name;
            let c = tree.children.find(ch => ch.name == nme) as TreeMapNode;
            let cr = tree_ref.children.find(ch => ch.name == nme) as TreeMapNode;

            //console.log("\n");
            //console.log(c);
            //console.log(cr);
            let delta_c = (c.value / val) * (parent_division.cmax - parent_division.cmin);
            let delta = (c.value / total_value_frontier) * (X1 - X0);
            let delta_ref = (idx.value / total_value_frontier_ref) * (X1r - X0r);
            arr = arr.concat(BuildSquarify(c, cr, { x0: so_far , x1: so_far+delta, y0: Y0, y1: Y0+height, x0r: so_far_ref, x1r: so_far_ref+delta_ref, y0r: Y0r, y1r: Y0r+height_ref, cmin: cstart, cmax: cstart + delta_c}));
            cstart += delta_c;
            so_far += delta;
            so_far_ref += delta_ref;
          }
          Y0 += height;
          Y0r += height_ref;
          value_so_far += total_value_frontier;
          value_so_far_reference += total_value_frontier_ref;

          // decide where to slice next
          slice_dimension = 0;
          if(Y1r-Y0r > X1r - X0r)
            slice_dimension = 1;

          previous_ratio = Infinity;
          frontier = [];
        }
      }

    }


    return arr;
  }
}

export function BuildTreeMap(tree: TreeMapNode, type: string, parent_division: any): RectNode[] {
  if (tree.leaf)
    return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (tree.lim_max + tree.lim_min) / 2) + 60) % 360, color_s: 50, color_l: 50, color_a: 1.0, transition: Change.None } as RectNode]
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
    let idx = tree.children.map((el, id) => { return { v: el.value, id: id } }).sort((a, b) => { return a.v - b.v; });
    for (let i = 0; i < tree.children.length; i++) {
      let c = tree.children[idx[i].id];

      let delta = (c.value / val) * (end - start);
      if (parent_division.slice == 0)
        arr = arr.concat(BuildTreeMap(c, type, { x0: start + so_far, x1: start + so_far + delta, y0: parent_division.y0, y1: parent_division.y1, slice: new_slice }))
      //arr = arr.concat(BuildTreeMap(c, type, { x0: start + so_far, x1: start + so_far + delta, y0: parent_division.y0, y1: parent_division.y1, slice: new_slice }))

      if (parent_division.slice == 1)
        arr = arr.concat(BuildTreeMap(c, type, { x0: parent_division.x0, x1: parent_division.x1, y0: start + so_far, y1: start + so_far + delta, slice: new_slice }))
      so_far += delta;
    }
    return arr;
  }
}

export function get_layout_names(): any[] {
  return [{ Name: "s&d_h", DisplayName: "Slice & dice horizontal", Description: "Slice and dice algorithm starting with horizontal division." },
  { Name: "s&d_v", DisplayName: "Slice & dice vertical", Description: "Slice and dice algorithm starting with vertical division." },
  { Name: "sq", DisplayName: "Squarify", Description: "Greedy sqarify algorithm ." }];
}

/**
 *
 * @param trees array of trees for different timesteps
 * @param layout layout type
 * @returns
 */
export function data_to_rectangles(trees: TreeMapNode[], layout: string, width: number, height: number): [RectNode[][], Changelog[][]] {

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
    if(layout == "sq")
      rectangles.push(BuildSquarify(trees[i], trees[0], { x0: 0, x1: width, y0: 0, y1: height, x0r: 0, x1r: width, y0r: 0, y1r: height, cmin: 0, cmax: 1 }));
    if (layout == "s&d_h")
      rectangles.push(SliceAndDiceTreeMapCont(trees[i], trees[0], { x0: 0, x1: width, y0: 0, y1: height, slice: 1, cmin: 0, cmax: 1 }));
    if (layout == "s&d_v")
      rectangles.push(SliceAndDiceTreeMapCont(trees[i], trees[0], { x0: 0, x1: width, y0: 0, y1: height, slice: 0, cmin: 0, cmax: 1 }));
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



  for (let i = 1; i < rectangles.length ; i++) {
    for (let k = 0; k < rectangles[i].length; k++) {
      let filtered = changelogs[i-1].filter((el) => { return el.Name == rectangles[i][k].name; });

      if (filtered.length > 0) {
        if (filtered[0].Type == "Create") {
          console.log("CREATE ", rectangles[i-1][k].name, rectangles[i][k].name)
          //between i-1 and i, the k-th rectangle appeared
          rectangles[i-1][k].color_l = 100;
          rectangles[i-1][k].y0 = 0;
          rectangles[i-1][k].y1 = 1;
          rectangles[i][k].transition = Change.Create;


        }
        else if (filtered[0].Type == "Delete") {
          console.log("DELETE ", rectangles[i-1][k].name, rectangles[i][k].name)
          // something disappeared between i-1 and i.
          rectangles[i][k].color_l = 0;
          rectangles[i][k].color_s = 100;
          rectangles[i][k].transition = Change.Delete;

        }
        else if (filtered[0].Type == "Move") {
          console.log("MOVE ", rectangles[i-1][k].name, rectangles[i][k].name)
          rectangles[i][k].transition = Change.Move;
        }
      }
    }

  }

  return [rectangles, changelogs];

}

/**
 * finds structural differences using hash-based algorithm
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
