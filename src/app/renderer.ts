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
  id: string,
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
    .select(id)
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

      let ret: (t: number) => void = (t) => { };

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
          if (tmp <= 0) {
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





  d3.select(id)
    .select('svg')
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

      let ret: (t: number) => void = (t) => { };

      {
        let t_start = 0;
        let length = 1;

        ret = (t) => {
          let display_text: string = '';
          if (
            Math.floor(d.end.y1 - d.end.y0) < 16 ||
            Math.floor(d.end.x1 - d.end.x0) < 10
          )
            display_text = '';
          else
            display_text = d.end.name + ' - ' + value_smart_print(interp_lin(t, 0, 1, d.start.value, d.end.value));
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
            .html("")
            .append('xhtml:div')
            .html(display_text)
            .style('width', '100%')
            .style('height', '100%')
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

export function render_with_change(rectangles_start: RectNode[],
  rectangles_end: RectNode[],
  duration: number,
  id: string) {
  let creation_occurs = false; // flag that will be true if at least one node is created in this transition
  let deletion_occurs = false; // flag that will be true if at least one node gets deleted in this transition
  let rectangles_combined: any[] = rectangles_start.map((el, i) => {
    if (rectangles_end[i].transition == Change.Create) creation_occurs = true;
    if (rectangles_end[i].transition == Change.Delete) deletion_occurs = true;
    return { start: el, end: rectangles_end[i] };
  });

  d3.select('body')
    .select(id)
    .select('svg')
    .selectAll('rect')
    .data(rectangles_combined)
    .transition()
    .attr('id', (r) => {
      return '#' + r.end.name;
    })
    //.attr("width", (r: any) => { return (r.end.x1 - r.end.x0).toString() + "%"; })
    //.attr("height", (r) => { return (r.end.y1 - r.end.y0).toString() + "%"; })
    //.attr("x", (r) => { return (r.end.x0).toString() + "%"; })
    //.attr("y", (r) => { return (r.end.y0).toString() + "%"; })
    //.attr("fill", (r) => { let rgb = hslToRgb(r.end.color_h, r.end.color_s, r.end.color_l); return "rgb(" + Math.round(rgb[0]) + ", " + Math.round(rgb[1]) + ", " + Math.round(rgb[2]) + ")"; })
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

      let ret: (t: number) => void = (t) => { };

      if (d.end.transition == Change.Delete) {
        //i_h = d3.interpolate(currentAngle, currentAngle);
        //i_l = (t) => { return t < 1/3 ? 100*Math.sin(9*Math.PI/4*t+Math.PI/4) : 0; };
        ret = (t) => {
          let t_start = 0;
          let length = 1 / 5 - 1 / 10;
          let hue_angle = d.start.color_h;

          let lum: number = d.start.color_l; //(100-d.start.color_l)/2*Math.sin((t-t_start)/length*10*Math.PI - 0.5*Math.PI)+d.start.color_l+(100-d.start.color_l)/2;
          let sat: number =
            ((100 - d.start.color_s) / 2) *
            Math.sin(
              ((t - t_start) / length) * 10 * Math.PI - 0.5 * Math.PI
            ) +
            d.start.color_l +
            (100 - d.start.color_s) / 2;
          let alpha: number = interp_lin(
            t,
            t_start + length * 0.8,
            t_start + length,
            d.start.color_a,
            0.0
          );
          //console.log("delete",t,lum,sat,alpha);
          //let lum = Math.round(interp_hat(t, 0, 1 / 6-1/20, 1 / 3-1/20, d.start.color_l, 0, 50));
          //let alpha: number = interp_lin(t, 1/6-1/20, 1 / 3-1/20, d.start.color_a, 0.0);
          d3.select(this).attr(
            'fill',
            'hsla(' +
            hue_angle +
            ', ' +
            sat +
            '%, ' +
            lum +
            '%, ' +
            alpha +
            ')'
          );
        };
      } else if (d.end.transition == Change.Create) {
        ret = (t) => {
          let t_start = 0.8;
          let length = 0.2;
          let hue_angle = d.end.color_h;
          let sat: number =
            t < 0.9
              ? ((100 - d.end.color_s) / 2) *
              Math.sin(
                ((t - t_start) / length) * 10 * Math.PI - 0.5 * Math.PI
              ) +
              d.end.color_s +
              (100 - d.start.color_s) / 2
              : d.end.color_s;
          let alpha: number = interp_lin(
            t,
            t_start,
            t_start + 1 / 20,
            0.0,
            1.0
          );
          //console.log(hue_angle, sat, alpha)
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
              alpha +
              ')'
            )
            .attr('x', d.end.x0.toString() + '')
            .attr('y', d.end.y0.toString() + '')
            .attr('width', (d.end.x1 - d.end.x0).toString() + '')
            .attr('height', (d.end.y1 - d.end.y0).toString() + '');
        };
      } else if (d.end.transition == Change.Move) {
        let t_start = 1 / 5;
        let length = 3 / 5;
        ret = (t) => {
          let hue_angle: number =
            Math.round(
              interp_lin(
                t,
                t_start + (length * 2) / 3,
                t_start + length,
                currentAngle,
                targetAngle
              )
            ) % 360;
          let x: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.x0,
            d.end.x0
          );
          let y: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.y0,
            d.end.y0
          );
          let w: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.x1 - d.start.x0,
            d.end.x1 - d.end.x0
          );
          let h: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.y1 - d.start.y0,
            d.end.y1 - d.end.y0
          );
          let sat: number = 0;
          if (t < t_start) sat = d.start.color_s;
          else if (t >= t_start && t <= t_start + length / 3)
            sat =
              ((100 - d.start.color_s) / 2) *
              Math.sin(
                ((t - t_start) / length) * 3 * 5 * Math.PI - 0.5 * Math.PI
              ) +
              d.start.color_l +
              (100 - d.start.color_s) / 2;
          //interp_hat(t, 1 / 3+1/20, 1/3 + 1 / 6, 2 / 3-1/20, d.start.color_s, 100, d.end.color_s);
          else if (t > t_start + length / 3 && t < t_start + (length * 2) / 3)
            sat = 100;
          else
            sat = interp_lin(
              t,
              t_start + (length * 2) / 3,
              t_start + length,
              100,
              d.end.color_s
            );
          //console.log("move ",t,sat);
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
      } // if (d.end.transition == Change.None)
      else {
        let t_start = 1 / 5;
        let length = 3 / 5;
        ret = (t) => {
          let hue_angle: number =
            Math.round(
              interp_lin(
                t,
                t_start + length / 3,
                t_start + (length / 3) * 2,
                currentAngle,
                targetAngle
              )
            ) % 360;
          let x: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.x0,
            d.end.x0
          );
          let y: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.y0,
            d.end.y0
          );
          let w: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.x1 - d.start.x0,
            d.end.x1 - d.end.x0
          );
          let h: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.y1 - d.start.y0,
            d.end.y1 - d.end.y0
          );

          d3.select(this)
            .attr(
              'fill',
              'hsla(' +
              hue_angle +
              ', ' +
              d.end.color_s +
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


  //let width = this.svg_width;
  //let height = this.svg_height;

  let tip = d3
    .select('#playground')
    .append('div')
    .attr('id', 'tt')
    .style('position', 'absolute')
    .style('background-color', 'white')
    .style('color', 'black')
    .style('opacity', 0);

  d3.select(id)
    .select('svg')
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

      let ret: (t: number) => void = (t) => { };

      if (d.end.transition == Change.Delete) {
        //i_h = d3.interpolate(currentAngle, currentAngle);
        //i_l = (t) => { return t < 1/3 ? 100*Math.sin(9*Math.PI/4*t+Math.PI/4) : 0; };
        ret = (t) => {
          let t_start = 0;
          let length = 1 / 5 - 1 / 10;
          let hue_angle = d.start.color_h;

          //let lum: number = d.start.color_l;//(100-d.start.color_l)/2*Math.sin((t-t_start)/length*10*Math.PI - 0.5*Math.PI)+d.start.color_l+(100-d.start.color_l)/2;
          //let sat: number = (100 - d.start.color_s) / 2 * Math.sin((t - t_start) / length * 10 * Math.PI - 0.5 * Math.PI) + d.start.color_l + (100 - d.start.color_s) / 2;;
          let alpha: number = interp_lin(
            t,
            t_start + length * 0.8,
            t_start + length,
            d.start.color_a,
            0.0
          );
          //console.log("delete",t,lum,sat,alpha);
          //let lum = Math.round(interp_hat(t, 0, 1 / 6-1/20, 1 / 3-1/20, d.start.color_l, 0, 50));
          //let alpha: number = interp_lin(t, 1/6-1/20, 1 / 3-1/20, d.start.color_a, 0.0);
          d3.select(this).join('xhtml:div').attr('opacity', alpha.toString());

          //.attr('fill', "hsla(" + hue_angle + ", " + sat + "%, " + lum + "%, " + alpha + ")")
        };
      } else if (d.end.transition == Change.Create) {
        let display_text: string = '';
        if (
          Math.floor(d.end.y1 - d.end.y0) < 16 ||
          Math.floor(d.end.x1 - d.end.x0) < 10
        )
          display_text = '';
        else
          display_text = d.end.name + ' - ' + value_smart_print(d.end.value);

        ret = (t) => {
          //console.log(hue_angle, sat, alpha)
          if (t >= 0.9) {
            d3.select(this)
              .attr('x', d.end.x0.toString() + '')
              .attr('y', d.end.y0.toString() + '')
              .attr('width', (d.end.x1 - d.end.x0).toString() + '')
              .attr('height', (d.end.y1 - d.end.y0).toString() + '')
              .html("")
              .append('xhtml:div')
              .style('opacity', d.end.color_a.toString())
              .style('width', '100%')
              .style('height', '100%')
              .style('color', '#fff')
              .style('white-space', 'pre-wrap')
              .style('white-space', '-moz-pre-wrap')
              .style('white-space', '-pre-wrap')
              .style('white-space', '-o-pre-wrap')
              .style('word-wrap', 'normal')
              .style('text-align', 'center')
              .style('display', 'flex')
              .style('justify-content', 'center')
              .style('align-items', 'center')
              .style('overflow-y', 'hidden')
              .style('overflow-x', 'hidden')
              .style('font-size', '16px')
              .html(display_text);

          }

        };
      } else if (d.end.transition == Change.Move) {
        let t_start = 1 / 5;
        let length = 3 / 5;

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
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.x0,
            d.end.x0
          );
          let y: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.y0,
            d.end.y0
          );
          let w: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.x1 - d.start.x0,
            d.end.x1 - d.end.x0
          );
          let h: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.y1 - d.start.y0,
            d.end.y1 - d.end.y0
          );

          //console.log("move ",t,sat);
          d3.select(this)
            .attr('x', x.toString() + '')
            .attr('y', y.toString() + '')
            .attr('width', w.toString() + '')
            .attr('height', h.toString() + '')
            .html("")
            .append('xhtml:div')
            .html(display_text)
            .style('width', '100%')
            .style('height', '100%')
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
      } // if (d.end.transition == Change.None)
      else {
        let t_start = 1 / 5;
        let length = 3 / 5;
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
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.x0,
            d.end.x0
          );
          let y: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.y0,
            d.end.y0
          );
          let w: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.x1 - d.start.x0,
            d.end.x1 - d.end.x0
          );
          let h: number = interp_lin(
            t,
            t_start + length / 3,
            t_start + (length / 3) * 2,
            d.start.y1 - d.start.y0,
            d.end.y1 - d.end.y0
          );

          d3.select(this)
            .attr('x', x.toString() + '')
            .attr('y', y.toString() + '')
            .attr('width', w.toString() + '')
            .attr('height', h.toString() + '')
            .html("")
            .append('xhtml:div')
            .style('width', '100%')
            .style('height', '100%')
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
            .style('font-size', '16px')
            .html(display_text);
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
export function render_static(rectangles: RectNode[], id: string) {

  d3.select(id).selectAll('g').remove();

  var g = d3.select(id).select('svg').selectAll('.rect')
    .data(rectangles)
    .enter()
    .append('g');

  //.classed('rect', true)

  d3.select('body').selectAll('#tt').remove();

  let tip = d3
    .select('#playground')
    .append('div')
    .attr('id', 'tt')
    .style('position', 'absolute')
    .style('background-color', 'white')
    .style('color', 'black')
    .style('opacity', 0);

  g.append('rect')
    //  .attr("id", (r) => { return "#" + r.name; })
    .attr('width', (r: RectNode) => {
      return (r.x1 - r.x0).toString() + '';
    })
    .attr('height', (r: RectNode) => {
      return (r.y1 - r.y0).toString() + '';
    })
    .attr('x', (r: RectNode) => {
      return r.x0.toString() + '';
    })
    .attr('y', (r: RectNode) => {
      return r.y0.toString() + '';
    })
    .attr('fill', (r: RectNode) => {
      let rgb = hslToRgb(r.color_h, r.color_s, r.color_l);
      return (
        'rgba(' +
        Math.round(rgb[0]) +
        ', ' +
        Math.round(rgb[1]) +
        ', ' +
        Math.round(rgb[2]) +
        ', 1.0)'
      );
    });

  g.append('foreignObject')
    .attr('x', (d: RectNode) => {
      return d.x0.toString() + '';
    })
    .attr('y', (d: RectNode) => {
      return d.y0.toString() + '';
    })
    .attr('width', (d: RectNode) => {
      return (d.x1 - d.x0).toString() + '';
    })
    .attr('height', (d: RectNode) => {
      return (d.y1 - d.y0).toString() + '';
    })
    .on('mouseover', function (d, i: RectNode) {
      tip
        .style('opacity', 1)
        .html(
          i.name +
          ' - ' +
          value_smart_print(i.value) +
          '<br />Ratio: ' +
          ratio(i.x1 - i.x0, i.y1 - i.y0).toPrecision(6) +
          '<br />Path: ' +
          i.path?.join(' <span>&#10148;</span> ')
        )
        .style('left', (d.clientX - 25).toString() + 'px')
        .style('top', (d.clientY - 75).toString() + 'px');

      //Makes the new div appear on hover
    })
    .on('mouseout', function (d, i) {
      tip.style('opacity', 0);
    })
    .append('xhtml:div')
    .style('width', '100%') // (d) => { return ((d.x1 - d.x0)).toString() + "px"; })
    .style('height', '100%') //(d) => { return ((d.y1 - d.y0)).toString() + "px"; })
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
    .style('font-size', '16px')
    .html((d: RectNode) => {
      if (Math.floor(d.y1 - d.y0) < 16 || Math.floor(d.x1 - d.x0) < 10)
        return '';
      else return d.name + ' - ' + value_smart_print(d.value);
    });
}


