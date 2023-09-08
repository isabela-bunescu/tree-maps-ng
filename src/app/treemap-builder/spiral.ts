import * as d3 from 'd3';
import { Change, IsIn, RectNode, TreeMapNode } from '../tree-map-node';

var EAST = 0;
var SOUTH = 1;
var WEST = 2;
var NORTH = 3;

export function BuildSpiral(
  root: TreeMapNode,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  cmin: number,
  cmax: number,
  ascending: boolean,
  path: string[] = []
) {
  if (root.leaf)
    return [
      {
        name: root.name,
        value: root.value,
        x0: x0,
        x1: x1,
        y0: y0,
        y1: y1,
        color: '#fff000',
        color_h: (Math.round((360 * (cmin + cmax)) / 2) + 60) % 360,
        color_s: 50,
        color_l: 40,
        color_a: 1.0,
        transition: Change.None,
        path: path
      } as RectNode,
    ];

  var EAST = 0;
  var SOUTH = 1;
  var WEST = 2;
  var NORTH = 3;
  var direction = EAST;
  let nodes: TreeMapNode[] = root.children
    .map((el) => el)
    .sort((a, b) => {
      if (ascending) return a.value - b.value;
      else return b.value - a.value;
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

  for (i = 0; i < n; i++) nodesSum += nodes[i].value;

  for (i = 0; i < n; i++) {
    let node: RectNode = {
      name: nodes[i].name,
      value: nodes[i].value,
      x0: x0,
      x1: x1,
      y0: y0,
      y1: y1,
      color: '',
      color_h: 0,
      color_s: 0,
      color_l: 0,
      color_a: 0,
    } as RectNode;
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

    node = segment[segment.length - 1];

    // Compute new aspect ratio.
    nodeAspectRatio =
      direction & 1
        ? (node.y1 - node.y0) / (node.x1 - node.x0)
        : (node.x1 - node.x0) / (node.y1 - node.y0);
    avgAspectRatio = d3.sum(segment, function (d) {
      return direction & 1
        ? (d.y1 - d.y0) / (d.x1 - d.x0)
        : (d.x1 - d.x0) / (d.y1 - d.y0);
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
  nodesSum = nodes.reduce((v, el) => el.value + v, 0);
  let cnow: number = cmin;

  for (let i = 0; i < all_rects.length; i++) {
    let deltac = (all_rects[i].value / nodesSum) * (cmax - cmin);
    arr = arr.concat(
      BuildSpiral(
        nodes[i],
        all_rects[i].x0,
        all_rects[i].x1,
        all_rects[i].y0,
        all_rects[i].y1,
        cnow,
        cnow + deltac,
        ascending,
        path.concat(root.name)
      )
    );
    cnow += deltac;
  }

  return arr;
}

export function BuildSpiralCont(
  root: TreeMapNode,
  root_ref: TreeMapNode,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  cmin: number,
  cmax: number,
  ascending: boolean,
  x0r: number,
  x1r: number,
  y0r: number,
  y1r: number,
  path: string[] = []
) {
  if (root.leaf)
    return [
      {
        name: root.name,
        value: root.value,
        x0: x0,
        x1: x1,
        y0: y0,
        y1: y1,
        color: '#fff000',
        color_h: (Math.round((360 * (cmin + cmax)) / 2) + 60) % 360,
        color_s: 50,
        color_l: 40,
        color_a: 1.0,
        transition: Change.None,
        path: path
      } as RectNode,
    ];

  var EAST = 0;
  var SOUTH = 1;
  var WEST = 2;
  var NORTH = 3;
  var direction = EAST;
  let nodes: TreeMapNode[] = root.children
    .map((el) => el)
    .sort((a, b) => {
      if (ascending) return a.value - b.value;
      else return b.value - a.value;
    });
  let nodes_ref: TreeMapNode[] = root_ref.children
    .map((el) => el)
    .sort((a, b) => {
      if (ascending) return a.value - b.value;
      else return b.value - a.value;
    });
  nodes_ref=nodes_ref.concat(nodes.filter((el) => {return !nodes_ref.some((e2) => e2.name==el.name); }));
  //var node: TreeMapNode;

  var newX0 = x0;
  var newX1 = x1;
  var newY0 = y0;
  var newY1 = y1;
  var newX0r = x0r;
  var newX1r = x1r;
  var newY0r = y0r;
  var newY1r = y1r;
  var availWidth = x1 - x0;
  var availHeight = y1 - y0;
  var availWidth_ref = x1r - x0r;
  var availHeight_ref = y1r - y0r;
  var avgAspectRatio = 0;
  var nodeAspectRatio = 0;
  let segment: RectNode[] = [];
  let segmentSum = 0;

  let segment_ref: RectNode[] = [];
  let segmentSum_ref: number = 0;
  let nodesSum_ref: number = 0;
  var nodesSum = 0;
  let all_rects_ref: RectNode[] = [];
  var all_rects: RectNode[] = [];

  nodesSum = nodes.reduce((pv, el) => pv + el.value, 0);
  nodesSum_ref = nodes_ref.reduce((pv, el) => pv + el.value, 0);

  for (let k = 0; k < nodes_ref.length; k++) {
    segment_ref.push({
      name: String(nodes_ref[k].name),
      value: nodes_ref[k].value,
      x0: x0,
      x1: x1,
      y0: y0,
      y1: y1,
      color: '',
      color_h: 0,
      color_s: 0,
      color_l: 0,
      color_a: 0,
    } as RectNode);
    segmentSum_ref += nodes_ref[k].value;

    segment_ref = scale_segment(
      segment_ref,
      newX0r,
      newX1r,
      newY0r,
      newY1r,
      segmentSum_ref,
      nodesSum_ref,
      availWidth_ref,
      availHeight_ref,
      direction
    );

    let node_ref = segment_ref[segment_ref.length - 1];

    // Compute new aspect ratio.
    nodeAspectRatio =
      direction & 1
        ? (node_ref.y1 - node_ref.y0) / (node_ref.x1 - node_ref.x0)
        : (node_ref.x1 - node_ref.x0) / (node_ref.y1 - node_ref.y0);

    avgAspectRatio = d3.sum(segment_ref, function (d) {
      return direction & 1
        ? (d.y1 - d.y0) / (d.x1 - d.x0)
        : (d.x1 - d.x0) / (d.y1 - d.y0);
    });

    // If avg aspect ratio is small, update boundaries and start a new segment.
    if (avgAspectRatio / segment_ref.length < 1.618033988749895) {
      // construct segment of new stuff

      for (let j = 0; j < segment_ref.length; ++j) {
        let nds: TreeMapNode[] = nodes.filter(
          (el) => segment_ref[j].name == el.name
        );

        if (nds.length > 0) {
          segment.push({
            name: String(nds[0].name),
            value: nds[0].value,
            x0: x0,
            x1: x1,
            y0: y0,
            y1: y1,
            color: '',
            color_h: 0,
            color_s: 0,
            color_l: 0,
            color_a: 0,
          } as RectNode);
          segmentSum += nds[0].value;
        }
      }

      segment = scale_segment(
        segment,
        newX0,
        newX1,
        newY0,
        newY1,
        segmentSum,
        nodesSum,
        availWidth,
        availHeight,
        direction
      );

      if (segment.length > 0) {
        let node = segment[segment.length - 1];

        if (direction === EAST) {
          newY0r = node_ref.y1;
          newY0 = node.y1;
          availHeight = newY1 - newY0;
          availHeight_ref = newY1r - newY0r;
        } else if (direction === SOUTH) {
          newX1r = node_ref.x0;
          newX1 = node.x0;
          availWidth = newX1 - newX0;
          availWidth_ref = newX1r - newX0r;
        } else if (direction === WEST) {
          newY1r = node_ref.y0;
          newY1 = node.y0;
          availHeight = newY1 - newY0;
          availHeight_ref = newY1r - newY0r;
        } else if (direction === NORTH) {
          newX0r = node_ref.x1;
          newX0 = node.x1;
          availWidth = newX1 - newX0;
          availWidth_ref = newX1r - newX0r;
        }
      }

      nodesSum_ref -= segmentSum_ref;
      nodesSum -= segmentSum;
      all_rects_ref = all_rects_ref.concat(segment_ref);
      all_rects = all_rects.concat(segment);
      segment = [];
      segment_ref = [];
      segmentSum = 0;
      segmentSum_ref = 0;
      avgAspectRatio = 0;
      direction = (direction + 1) % 4;
    }
  }

  // arrange rectangles if any left
  // the reference set is added to the total reference rectangles
  all_rects_ref = all_rects_ref.concat(segment_ref);
  // more careful things should be done for the current set
  for (let j = 0; j < segment_ref.length; ++j) {
    let nds: TreeMapNode[] = nodes.filter(
      (el) => segment_ref[j].name == el.name
    );

    if (nds.length > 0) {
      segment.push({
        name: String(nds[0].name),
        value: nds[0].value,
        x0: x0,
        x1: x1,
        y0: y0,
        y1: y1,
        color: '',
        color_h: 0,
        color_s: 0,
        color_l: 0,
        color_a: 0,
      } as RectNode);
      segmentSum += nds[0].value;
    }
  }
  // add what is different from the reference

  if (segment.length == 0) (direction = direction + 1) % 4;
  segment = segment.concat(
    nodes
      .filter(
        (el) => all_rects_ref.filter((el2) => el2.name == el.name).length == 0
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (el) =>
          ({
            name: String(el.name),
            value: el.value,
            x0: x0,
            x1: x1,
            y0: y0,
            y1: y1,
            color: '',
            color_h: 0,
            color_s: 0,
            color_l: 0,
            color_a: 0,
          } as RectNode)
      )
  );
  segmentSum = segment.reduce((pv, el) => pv + el.value, 0);

  // scale the remaining segment
  segment = scale_segment(
    segment,
    newX0,
    newX1,
    newY0,
    newY1,
    segmentSum,
    nodesSum,
    availWidth,
    availHeight,
    direction
  );

  all_rects = all_rects.concat(segment);

  let arr: RectNode[] = [];
  nodesSum = nodes.reduce((v, el) => el.value + v, 0);
  let cnow: number = cmin;

  for (let i = 0; i < all_rects.length; i++) {
    let deltac = (all_rects[i].value / nodesSum) * (cmax - cmin);
    let node = nodes.find((el) => el.name == all_rects[i].name) as TreeMapNode;
    let node_ref = nodes_ref.find(
      (el) => el.name == all_rects[i].name
    ) as TreeMapNode;
    let rect_ref: RectNode = all_rects_ref.find(
      (el) => el.name == all_rects[i].name
    ) as RectNode;

    arr = arr.concat(
      BuildSpiralCont(
        node,
        node_ref,
        all_rects[i].x0,
        all_rects[i].x1,
        all_rects[i].y0,
        all_rects[i].y1,
        cnow,
        cnow + deltac,
        ascending,
        rect_ref == undefined ? 0 : rect_ref.x0,
        rect_ref == undefined ? 0 : rect_ref.x1,
        rect_ref == undefined ? 0 : rect_ref.y0,
        rect_ref == undefined ? 0 : rect_ref.y1,
        path.concat(root.name)
      )
    );
    cnow += deltac;
  }

  return arr;
}

/**
 * Takes an array of unarranged rectangles and arranges them as a segment in the desired order taking into the consideration the current viewport.
 * @param segment the current segment formed by rectangels
 * @param newX0 the new x0 coordinate of the wiewport
 * @param newX1 the new x1 coordinate of the wiewport
 * @param newY0 the new y0 coordinate of the wiewport
 * @param newY1 the new y1 coordinate of the wiewport
 * @param segmentSum the total sum of the values contained in the segment
 * @param nodesSum the total sum of the nodes left to arrange
 * @param availWidth the available width
 * @param availHeight the available height
 * @param direction the direction of the segment (EAST, WEST, SOUTH, NORTH)
 * @returns the arranges rectangles
 */
function scale_segment(
  segment: RectNode[],
  newX0: number,
  newX1: number,
  newY0: number,
  newY1: number,
  segmentSum: number,
  nodesSum: number,
  availWidth: number,
  availHeight: number,
  direction: number
) {
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
  return segment;
}
