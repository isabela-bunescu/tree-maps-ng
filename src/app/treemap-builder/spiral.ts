import * as d3 from "d3";
import { Change, RectNode, TreeMapNode } from "../tree-map-node";

export function BuildSpiral(root: TreeMapNode, x0: number, x1: number, y0: number, y1: number, cmin: number, cmax: number, ascending: boolean) {

  if (root.leaf)
    return [{ name: root.name, value: root.value, x0: x0, x1: x1, y0: y0, y1: y1, color: "#fff000", color_h: (Math.round(360 * (cmin + cmax) / 2) + 60) % 360, color_s: 50, color_l: 40, color_a: 1.0, transition: Change.None } as RectNode];

  var EAST = 0;
  var SOUTH = 1;
  var WEST = 2;
  var NORTH = 3;
  var direction = EAST;
  let nodes: TreeMapNode[] = root.children.map(el => el).sort((a, b) => {
    if (ascending)
      return a.value - b.value;
    else
      return b.value - a.value;
  });

  //var node: TreeMapNode;
  var n = nodes.length;
  var i = -1;
  var newX0 = x0;
  var newX1 = x1;
  var newY0 = y0;
  var newY1 = y1;
  var availWidth = x1 - x0;
  var availHeight = y1 - y0;
  var avgAspectRatio = 0;
  var nodeAspectRatio = 0;
  let segment: RectNode[] = [];
  let segmentSum = 0;
  var nodesSum = 0;
  var all_rects: RectNode[] = [];

  for (i = 0; i<n; i++) nodesSum += nodes[i].value;



  for(i=0;i<n;i++) {

    let node : RectNode = { name: nodes[i].name, value: nodes[i].value, x0: x0, x1: x1, y0: y0, y1: y1, color: "", color_h: 0, color_s: 0, color_l: 0, color_a: 0 } as RectNode;
    segment.push(node);

    segmentSum += node.value;

    if (direction === EAST) {
      // Update positions for each node.
      segment.forEach(function (d, i, arr) {
        d.x0 = i ? arr[i - 1].x1 : newX0;
        d.x1 = d.x0 + (d.value / segmentSum) * availWidth;
        d.y0 = newY0;
        d.y1 = newY0 + (segmentSum / nodesSum) * availHeight;
      });
    } else if (direction === SOUTH) {
      segment.forEach(function (d, i, arr) {
        d.x0 = newX1 - (segmentSum / nodesSum) * availWidth;
        d.x1 = newX1;
        d.y0 = i ? arr[i - 1].y1 : newY0;
        d.y1 = d.y0 + (d.value / segmentSum) * availHeight;
      });
    } else if (direction === WEST) {
      segment.forEach(function (d, i, arr) {
        d.x1 = i ? arr[i - 1].x0 : newX1;
        d.x0 = d.x1 - (d.value / segmentSum) * availWidth;
        d.y0 = newY1 - (segmentSum / nodesSum) * availHeight;
        d.y1 = newY1;
      });
    } else if (direction === NORTH) {
      segment.forEach(function (d, i, arr) {
        d.x1 = newX0 + (segmentSum / nodesSum) * availWidth;
        d.x0 = newX0;
        d.y1 = i ? arr[i - 1].y0 : newY1;
        d.y0 = d.y1 - (d.value / segmentSum) * availHeight;
      });
    }

    node = segment[segment.length-1];

    // Compute new aspect ratio.
    nodeAspectRatio = direction & 1 ? (node.y1 - node.y0) / (node.x1 - node.x0) : (node.x1 - node.x0) / (node.y1 - node.y0);
    avgAspectRatio = d3.sum(segment, function (d) {
      return direction & 1 ? (d.y1 - d.y0) / (d.x1 - d.x0) : (d.x1 - d.x0) / (d.y1 - d.y0);
    });

    // If avg aspect ratio is small, update boundaries and start a new segment.
    if (avgAspectRatio / segment.length < 1.618033988749895) {
      if (direction === EAST) {
        newY0 = node.y1;
        availHeight = newY1 - newY0;
      } else if (direction === SOUTH) {
        newX1 = node.x0;
        availWidth = newX1 - newX0;
      } else if (direction === WEST) {
        newY1 = node.y0;
        availHeight = newY1 - newY0;
      } else if (direction === NORTH) {
        newX0 = node.x1;
        availWidth = newX1 - newX0;
      }

      nodesSum -= segmentSum;
      all_rects = all_rects.concat(segment);
      segment = [];
      segmentSum = 0;
      avgAspectRatio = 0;
      direction = (direction + 1) % 4;
    }
  }

  all_rects = all_rects.concat(segment);

  let arr: RectNode[] = [];
  nodesSum = nodes.reduce((v,el)=> el.value+v, 0);
  let cnow: number = cmin;

  for(let i=0; i<all_rects.length; i++)
  {

    let deltac = all_rects[i].value / nodesSum * (cmax-cmin);
    arr = arr.concat(BuildSpiral(nodes[i], all_rects[i].x0, all_rects[i].x1, all_rects[i].y0, all_rects[i].y1, cnow, cnow+deltac, ascending));
    cnow += deltac;
  }

  return arr;
}

export function BuildSpiralCont(root: TreeMapNode, root_ref: TreeMapNode, x0: number, x1: number, y0: number, y1: number, cmin: number, cmax: number, ascending: boolean) {

  if (root.leaf)
    return [{ name: root.name, value: root.value, x0: x0, x1: x1, y0: y0, y1: y1, color: "#fff000", color_h: (Math.round(360 * (cmin + cmax) / 2) + 60) % 360, color_s: 50, color_l: 40, color_a: 1.0, transition: Change.None } as RectNode];

  var EAST = 0;
  var SOUTH = 1;
  var WEST = 2;
  var NORTH = 3;
  var direction = EAST;
  let nodes: TreeMapNode[] = root.children.map(el => el).sort((a, b) => {
    if (ascending)
      return a.value - b.value;
    else
      return b.value - a.value;
  });

  //var node: TreeMapNode;
  var n = nodes.length;
  var i = -1;
  var newX0 = x0;
  var newX1 = x1;
  var newY0 = y0;
  var newY1 = y1;
  var availWidth = x1 - x0;
  var availHeight = y1 - y0;
  var avgAspectRatio = 0;
  var nodeAspectRatio = 0;
  let segment: RectNode[] = [];
  let segmentSum = 0;
  var nodesSum = 0;
  var all_rects: RectNode[] = [];

  for (i = 0; i<n; i++) nodesSum += nodes[i].value;



  for(i=0;i<n;i++) {

    let node : RectNode = { name: nodes[i].name, value: nodes[i].value, x0: x0, x1: x1, y0: y0, y1: y1, color: "", color_h: 0, color_s: 0, color_l: 0, color_a: 0 } as RectNode;
    segment.push(node);

    segmentSum += node.value;

    if (direction === EAST) {
      // Update positions for each node.
      segment.forEach(function (d, i, arr) {
        d.x0 = i ? arr[i - 1].x1 : newX0;
        d.x1 = d.x0 + (d.value / segmentSum) * availWidth;
        d.y0 = newY0;
        d.y1 = newY0 + (segmentSum / nodesSum) * availHeight;
      });
    } else if (direction === SOUTH) {
      segment.forEach(function (d, i, arr) {
        d.x0 = newX1 - (segmentSum / nodesSum) * availWidth;
        d.x1 = newX1;
        d.y0 = i ? arr[i - 1].y1 : newY0;
        d.y1 = d.y0 + (d.value / segmentSum) * availHeight;
      });
    } else if (direction === WEST) {
      segment.forEach(function (d, i, arr) {
        d.x1 = i ? arr[i - 1].x0 : newX1;
        d.x0 = d.x1 - (d.value / segmentSum) * availWidth;
        d.y0 = newY1 - (segmentSum / nodesSum) * availHeight;
        d.y1 = newY1;
      });
    } else if (direction === NORTH) {
      segment.forEach(function (d, i, arr) {
        d.x1 = newX0 + (segmentSum / nodesSum) * availWidth;
        d.x0 = newX0;
        d.y1 = i ? arr[i - 1].y0 : newY1;
        d.y0 = d.y1 - (d.value / segmentSum) * availHeight;
      });
    }

    node = segment[segment.length-1];

    // Compute new aspect ratio.
    nodeAspectRatio = direction & 1 ? (node.y1 - node.y0) / (node.x1 - node.x0) : (node.x1 - node.x0) / (node.y1 - node.y0);
    avgAspectRatio = d3.sum(segment, function (d) {
      return direction & 1 ? (d.y1 - d.y0) / (d.x1 - d.x0) : (d.x1 - d.x0) / (d.y1 - d.y0);
    });

    // If avg aspect ratio is small, update boundaries and start a new segment.
    if (avgAspectRatio / segment.length < 1.618033988749895) {
      if (direction === EAST) {
        newY0 = node.y1;
        availHeight = newY1 - newY0;
      } else if (direction === SOUTH) {
        newX1 = node.x0;
        availWidth = newX1 - newX0;
      } else if (direction === WEST) {
        newY1 = node.y0;
        availHeight = newY1 - newY0;
      } else if (direction === NORTH) {
        newX0 = node.x1;
        availWidth = newX1 - newX0;
      }

      nodesSum -= segmentSum;
      all_rects = all_rects.concat(segment);
      segment = [];
      segmentSum = 0;
      avgAspectRatio = 0;
      direction = (direction + 1) % 4;
    }
  }

  all_rects = all_rects.concat(segment);

  let arr: RectNode[] = [];
  nodesSum = nodes.reduce((v,el)=> el.value+v, 0);
  let cnow: number = cmin;

  for(let i=0; i<all_rects.length; i++)
  {

    let deltac = all_rects[i].value / nodesSum * (cmax-cmin);
    arr = arr.concat(BuildSpiralCont(nodes[i], nodes[i], all_rects[i].x0, all_rects[i].x1, all_rects[i].y0, all_rects[i].y1, cnow, cnow+deltac, ascending));
    cnow += deltac;
  }

  return arr;
}
