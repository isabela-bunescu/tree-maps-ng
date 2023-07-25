import { Change, IsIn, RectNode, TreeMapNode } from "../tree-map-node";

export function BuildSquarify(tree: TreeMapNode, tree_ref: TreeMapNode, parent_division: any, type: string): RectNode[] {
  if (tree.leaf)
    return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (parent_division.cmin + parent_division.cmax) / 2) + 60) % 360, color_s: 50, color_l: 40, color_a: 1.0, transition: Change.None } as RectNode]
  else {

    let arr: RectNode[] = [];

    let slice_dimension = 0;
    if (parent_division.y1r - parent_division.y0r > parent_division.x1r - parent_division.x0r)
      slice_dimension = 1;

    let val = tree.children.reduce((pv, ch) => { return pv + ch.value; }, 0);
    //let val_ref = tree_ref.children.reduce((pv, ch) => { return pv + ch.value; }, 0);

    let so_far = 0;
    let ratio = (x) => { return x > 1 ? x : 1 / x; }

    let idx = tree_ref.children.map((el, id) => { return { v: el.value, id: id, n: el.name }; });
    // add if something is to add

    idx = idx.concat(
      tree.children.filter((el) => {
        return !IsIn(idx, (e2) => { return e2.n == el.name; })
      })
        .map((el, id) => {
          return { v: el.value, id: id, n: el.name };
        }));
    // delete if something needs to be deleted
    idx = idx.filter((el) => { return IsIn(tree.children, (e2) => { return el.n.localeCompare(e2.name) == 0; }) });
    // sort the indices
    idx = idx.sort((b, a) => { return a.v - b.v; });

    //let explored: number[] = [];
    let frontier: any[] = [];
    let to_explore: any[] = idx.map((el) => { return { name: el.n, value: el.v }; });

    let val_ref = idx.reduce((pv, el) => pv + el.v, 0);

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

    while (to_explore.length > 0) {

      // try add on a horizontal group
      if (slice_dimension == 0) {
        frontier.push(to_explore[0]);
        to_explore.shift();
        let total_value_frontier = frontier.reduce((pv, el) => pv + el.value, 0); // frontier.reduce((pv, el) => {return pv+tree.children.find(e => e.name == el.name)!.value;}, 0);
        let width = total_value_frontier / (val_ref - value_so_far_reference) * (X1r - X0r);
        //let mean_ratio = frontier.reduce((pv, el) => { return pv+ratio((tree.children.find(e => e.name == el.name)!.value/total_value_frontier)*(Y1-Y0)/width); }, 0)
        let mean_ratio: number = 1;
        if (type == "mean") {
          mean_ratio = frontier.reduce((pv, el) => pv + ratio(el.value / total_value_frontier * (Y1r - Y0r) / width), 0);
          mean_ratio /= frontier.length;
        }
        else if (type == "max") {
          mean_ratio = frontier.reduce((pv, el) => Math.max(pv, ratio(el.value / total_value_frontier * (Y1r - Y0r) / width)), 1);
        }
        //console.log(mean_ratio, previous_ratio, mean_ratio <= previous_ratio)
        if (mean_ratio <= previous_ratio && to_explore.length > 0)
          previous_ratio = mean_ratio;
        else {

          if (previous_ratio < mean_ratio) {
            let tmp = frontier.pop();
            to_explore.unshift(tmp as string);
          }

          // compute new available space
          let total_value_frontier_ref = frontier.reduce((pv, el) => pv + el.value, 0);
          let total_value_frontier = frontier.reduce((pv, el) => { return pv + tree.children.find(e => e.name == el.name)!.value; }, 0);
          let width = total_value_frontier / (val - value_so_far) * (X1 - X0);
          let width_ref = total_value_frontier_ref / (val_ref - value_so_far_reference) * (X1r - X0r);

          so_far = Y0;
          let so_far_ref = Y0r;
          for (let idx of frontier) {
            let nme = idx.name;
            let c = tree.children.find(ch => ch.name == nme) as TreeMapNode;
            let cr = tree_ref.children.find(ch => ch.name == nme) as TreeMapNode;

            //console.log(cr.name, c.name);

            let delta_c = (c.value / val) * (parent_division.cmax - parent_division.cmin);
            let delta = (c.value / total_value_frontier) * (Y1 - Y0);
            let delta_ref = (idx.value / total_value_frontier_ref) * (Y1r - Y0r);
            arr = arr.concat(BuildSquarify(c, cr, { x0: X0, x1: X0 + width, y0: so_far, y1: so_far + delta, x0r: X0r, x1r: X0r + width_ref, y0r: so_far_ref, y1r: so_far_ref + delta_ref, cmin: cstart, cmax: cstart + delta_c }, type));
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
          if (Y1r - Y0r < X1r - X0r)
            slice_dimension = 0;
          previous_ratio = Infinity;

          frontier = [];
        }
      }
      else {
        // slicing the other way
        frontier.push(to_explore[0]);
        to_explore.shift();
        let total_value_frontier = frontier.reduce((pv, el) => pv + el.value, 0); //frontier.reduce((pv, el) => {return pv+tree.children.find(e => e.name == el.name)!.value;}, 0);
        let height = total_value_frontier / (val_ref - value_so_far_reference) * (Y1r - Y0r);
        //let mean_ratio = frontier.reduce((pv, el) => { return pv+ratio((tree.children.find(e => e.name == el.name)!.value/total_value_frontier)*(X1-X0)/height); }, 0)
        let mean_ratio: number = 1;
        if (type == "mean") {
          mean_ratio = frontier.reduce((pv, el) => pv + ratio(el.value / total_value_frontier * (X1r - X0r) / height), 0);
          mean_ratio /= frontier.length;
        }
        else if (type == "max") {
          mean_ratio = frontier.reduce((pv, el) => Math.max(pv, ratio(el.value / total_value_frontier * (X1r - X0r) / height)), 1);
        }

        if (mean_ratio <= previous_ratio && to_explore.length > 0)
          previous_ratio = mean_ratio;
        else {
          if (previous_ratio < mean_ratio) {
            let tmp = frontier.pop();
            to_explore.unshift(tmp as string);
          }

          // compute new available space
          let total_value_frontier = frontier.reduce((pv, el) => { return pv + tree.children.find(e => e.name == el.name)!.value; }, 0);
          let total_value_frontier_ref = frontier.reduce((pv, el) => pv + el.value, 0);
          let height = total_value_frontier / (val - value_so_far) * (Y1 - Y0);
          let height_ref = total_value_frontier_ref / (val_ref - value_so_far_reference) * (Y1 - Y0);

          so_far = X0;
          let so_far_ref = X0r;

          for (let idx of frontier) {
            let nme = idx.name;
            let c = tree.children.find(ch => ch.name == nme) as TreeMapNode;
            let cr = tree_ref.children.find(ch => ch.name == nme) as TreeMapNode;

            //console.log("\n");
            //console.log(c);
            //console.log(cr);
            let delta_c = (c.value / val) * (parent_division.cmax - parent_division.cmin);
            let delta = (c.value / total_value_frontier) * (X1 - X0);
            let delta_ref = (idx.value / total_value_frontier_ref) * (X1r - X0r);
            arr = arr.concat(BuildSquarify(c, cr, { x0: so_far, x1: so_far + delta, y0: Y0, y1: Y0 + height, x0r: so_far_ref, x1r: so_far_ref + delta_ref, y0r: Y0r, y1r: Y0r + height_ref, cmin: cstart, cmax: cstart + delta_c }, type));
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
          if (Y1r - Y0r > X1r - X0r)
            slice_dimension = 1;

          previous_ratio = Infinity;
          frontier = [];
        }
      }

    }


    return arr;
  }
}
