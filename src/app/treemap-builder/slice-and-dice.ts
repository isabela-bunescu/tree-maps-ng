import { Change, RectNode, TreeMapNode } from "../tree-map-node";

export function SliceAndDiceAutoCont(tree: TreeMapNode, tree_ref: TreeMapNode, parent_division: any): RectNode[] {
  if (tree.leaf)
    return [{ name: tree.name, value: tree.value, x0: parent_division.x0, x1: parent_division.x1, y0: parent_division.y0, y1: parent_division.y1, color: "#fff000", color_h: (Math.round(360 * (parent_division.cmin + parent_division.cmax) / 2) + 300) % 360, color_s: 50, color_l: 40, color_a: 1.0, transition: Change.None } as RectNode]
  else {
    let start, end, new_slice, start_ref, end_ref;
    if ((parent_division.x1r-parent_division.x0r)<(parent_division.y1r-parent_division.y0r)) {
      start = parent_division.y0;
      end = parent_division.y1;
      start_ref = parent_division.y0r;
      end_ref = parent_division.y1r;
      new_slice = 1;
    }
    else {
      start = parent_division.x0;
      end = parent_division.x1;
      start_ref = parent_division.x0r;
      end_ref = parent_division.x1r;
      new_slice = 0;
    }

    let arr: RectNode[] = [];
    let val = tree.children.reduce((pv, ch) => { return pv + ch.value; }, 0);
    let val_ref = tree_ref.children.reduce((pv, ch) => { return pv + ch.value; }, 0);
    let so_far = 0;
    let so_far_ref = 0;

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
      if(tr==null)
        tr = c;
      //for (let i = 0; i < tree.children.length; i++) {
      //let c = tree.children[i];

      let delta = (c.value / val) * (end - start);
      let delta_c = c.value / val * (parent_division.cmax - parent_division.cmin);
      let delta_ref = (tr.value / val_ref) * (end_ref - start_ref);


      if (new_slice == 0)
        arr = arr.concat(SliceAndDiceAutoCont(c, tr, { x0: start + so_far, x1: start + so_far + delta, y0: parent_division.y0, y1: parent_division.y1, x0r: start_ref + so_far_ref, x1r: start_ref + so_far_ref + delta_ref, y0r: parent_division.y0r, y1r: parent_division.y1r, slice: new_slice, cmin: cstart, cmax: cstart + delta_c }))

      if (new_slice == 1)
        arr = arr.concat(SliceAndDiceAutoCont(c, tr, { x0: parent_division.x0, x1: parent_division.x1, y0: start + so_far, y1: start + so_far + delta, x0r: parent_division.x0r, x1r: parent_division.x1r, y0r: start_ref + so_far_ref, y1r: start_ref + so_far_ref + delta_ref, slice: new_slice, cmin: cstart, cmax: cstart + delta_c }))
      so_far += delta;
      so_far_ref += delta_ref;
      cstart += delta_c;
    }
    return arr;
  }

}
