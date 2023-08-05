import { Component } from '@angular/core';
import * as d3 from 'd3';
import { IndexEntry } from './index-entry';
import { Changelog, hslToRgb, value_smart_print } from './extras';
import {
  Change,
  RectNode,
  TreeMapNode,
  data_to_rectangles,
  get_layout_names,
  ratio,
  raw_data_to_trees,
} from './tree-map-node';
import { BuildTreeMap } from './tree-map-node';

export function interp_lin(
  t: number,
  t0: number,
  t1: number,
  y0: number,
  y1: number
) {
  return t >= t0 && t <= t1
    ? y0 + ((t - t0) / (t1 - t0)) * (y1 - y0)
    : t < t0
    ? y0
    : y1;
} // ramp function ___/------
export function interp_hat(
  t: number,
  t0: number,
  t1: number,
  t2: number,
  y0: number,
  y1: number,
  y2: number
) {
  return t >= t0 && t <= t1
    ? y0 + ((t - t0) / (t1 - t0)) * (y1 - y0)
    : t > t1 && t <= t2
    ? y1 + ((t - t1) / (t2 - t1)) * (y2 - y1)
    : t < t0
    ? y0
    : y2;
} // ramp function ___/------

export function render_no_change(
  rectangles_start: RectNode[],
  rectangles_end: RectNode[],
  duration: number,
  svg_handle: any,
  highlight: string = 'relative'
) {
  let creation_occurs = false; // flag that will be true if at least one node is created in this transition
  let deletion_occurs = false; // flag that will be true if at least one node gets deleted in this transition
  let rectangles_combined: any[] = rectangles_start.map((el, i) => {
    if (rectangles_end[i].transition == Change.Create) creation_occurs = true;
    if (rectangles_end[i].transition == Change.Delete) deletion_occurs = true;
    return { start: el, end: rectangles_end[i] };
  });

  let reference_percentage: number = 0;
  if (highlight == 'rel')
    reference_percentage = rectangles_combined.reduce((pv, el) => {
      let tmp = Math.abs(el.end.value - el.start.value) / el.start.value;
      return tmp > pv ? tmp : pv;
    }, 0);
  else if (highlight == 'abs') reference_percentage = 1;
  else reference_percentage = 0;

  d3.select('body')
    .select("#w1")
    .select('svg')
    .selectAll('rect')
    .data(rectangles_combined)
    .transition()
    .attr('id', (r) => {
      return '#' + r.end.name;
    })
    .delay(10)
    .tween('coloring', function (d) {
      let currentAngle = d.start.color_h;
      let targetAngle = d.end.color_h;

      //shortest path on the hue circle
      if (targetAngle - currentAngle > 180) {
        targetAngle -= 360;
      } else if (targetAngle - currentAngle < -180) {
        targetAngle += 360;
      }

      let ret: (t: number) => void = (t) => {};

      {
        let t_start = 0;
        let length = 1;

        let tmp: number = +d.start.color_s;

        if (reference_percentage > 0) {
          tmp = (d.end.value - d.start.value) / d.start.value;
          //console.log(tmp);
          if (tmp > 0)
            tmp =
              (100 - d.start.color_s) * tmp / reference_percentage +
              d.start.color_s;
          if (tmp <= 0){
            tmp = d.start.color_s * tmp / reference_percentage + d.start.color_s;

          }

        }

        ret = (t) => {
          let hue_angle: number =
            Math.round(
              interp_lin(
                t,
                t_start,
                t_start + length,
                currentAngle,
                targetAngle
              )
            ) % 360;

          let sat: number = interp_hat(
            t,
            t_start,
            t_start + length / 4,
            t_start + length / 2,
            d.start.color_s,
            tmp,
            d.end.color_s
          );

          let x: number = interp_lin(
            t,
            t_start,
            t_start + length,
            d.start.x0,
            d.end.x0
          );
          let y: number = interp_lin(
            t,
            t_start,
            t_start + length,
            d.start.y0,
            d.end.y0
          );
          let w: number = interp_lin(
            t,
            t_start,
            t_start + length,
            d.start.x1 - d.start.x0,
            d.end.x1 - d.end.x0
          );
          let h: number = interp_lin(
            t,
            t_start,
            t_start + length,
            d.start.y1 - d.start.y0,
            d.end.y1 - d.end.y0
          );

          d3.select(this)
            .attr(
              'fill',
              'hsla(' +
                hue_angle +
                ', ' +
                sat +
                '%, ' +
                d.end.color_l +
                '%, ' +
                d.start.color_a +
                ')'
            )
            .attr('x', x.toString() + '')
            .attr('y', y.toString() + '')
            .attr('width', w.toString() + '')
            .attr('height', h.toString() + '');
        };
      }

      return ret; /*
    return function(t) {
      let hue_angle = Math.round(i_h(t)) % 360;
      let lum = i_l(t);

      d3.select(this)
        .attr('fill', "hsl(" + hue_angle + " " + d.end.color_s + "% "+lum+"% )")
    }*/
    })
    .duration(duration);





    d3.select('svg')
    .selectAll('foreignObject')
    .data(rectangles_combined)
    .transition()
    .tween('position', function (d) {
      let currentAngle = d.start.color_h;
      let targetAngle = d.end.color_h;

      //shortest path on the hue circle
      if (targetAngle - currentAngle > 180) {
        targetAngle -= 360;
      } else if (targetAngle - currentAngle < -180) {
        targetAngle += 360;
      }

      let ret: (t: number) => void = (t) => {};

       {
        let t_start = 0;
        let length = 1;
        let display_text: string = '';
        if (
          Math.floor(d.end.y1 - d.end.y0) < 16 ||
          Math.floor(d.end.x1 - d.end.x0) < 10
        )
          display_text = '';
        else
          display_text = d.end.name + ' - ' + value_smart_print(d.end.value);
        ret = (t) => {
          let x: number = interp_lin(
            t,
            t_start,
            t_start + length,
            d.start.x0,
            d.end.x0
          );
          let y: number = interp_lin(
            t,
            t_start,
            t_start + length,
            d.start.y0,
            d.end.y0
          );
          let w: number = interp_lin(
            t,
            t_start,
            t_start + length,
            d.start.x1 - d.start.x0,
            d.end.x1 - d.end.x0
          );
          let h: number = interp_lin(
            t,
            t_start,
            t_start + length,
            d.start.y1 - d.start.y0,
            d.end.y1 - d.end.y0
          );

          d3.select(this)
            .attr('x', x.toString() + '')
            .attr('y', y.toString() + '')
            .attr('width', w.toString() + '')
            .attr('height', h.toString() + '')
            .join('xhtml:div')
            .attr('innerHTML', display_text)
            .style('width', w.toString() + '')
            .style('height', h.toString() + '')
            .style('color', '#fff')
            .style('white-space', 'pre-wrap')
            .style('white-space', '-moz-pre-wrap')
            .style('white-space', '-pre-wrap')
            .style(' white-space', '-o-pre-wrap')
            .style('word-wrap', 'normal')
            .style('text-align', 'center')
            .style('display', 'flex')
            .style('justify-content', 'center')
            .style('align-items', 'center')
            .style('overflow-y', 'hidden')
            .style('overflow-x', 'hidden')
            .style('font-size', '16px');
        };
      }

      return ret; /*
      return function(t) {
        let hue_angle = Math.round(i_h(t)) % 360;
        let lum = i_l(t);

        d3.select(this)
          .attr('fill', "hsl(" + hue_angle + " " + d.end.color_s + "% "+lum+"% )")
      }*/
    })
    .duration(duration);
}
