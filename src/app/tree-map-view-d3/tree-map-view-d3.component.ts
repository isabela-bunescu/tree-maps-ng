import { Component } from '@angular/core';
import * as d3 from 'd3';
import { DataFetcherService } from '../data-fetcher.service';
import { IndexEntry } from '../index-entry';
import { Changelog, hslToRgb, value_smart_print } from '../extras';
import {
  Change,
  RectNode,
  TreeMapNode,
  data_to_rectangles,
  get_layout_names,
  ratio,
  raw_data_to_trees,
} from '../tree-map-node';
import { BuildTreeMap } from '../tree-map-node';
import { Text } from '@visx/text';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { fromEvent } from 'rxjs';
import { interp_lin, render_no_change } from '../renderer';
//import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-tree-map-view-d3',
  templateUrl: './tree-map-view-d3.component.html',
  styleUrls: ['./tree-map-view-d3.component.css'],
})
export class TreeMapViewD3Component {
  public isLoaded = false; // is loaded flag
  public data: TreeMapNode[] = [];
  public rectangles: RectNode[][] = [];
  public timesteps = [0, 0];
  public time_min = 0;
  public time_max = 0;
  public time_step = 0;
  public index_time: number = 0;
  public index_time_prev: number = 0;
  public playing = false;
  public timer;
  public selectedLayoutIndex: number = 0;
  public Layouts: any[] = [];
  public selectedIndex: number = 0;
  public selectedValue: string = '';
  public Index: IndexEntry[] = [];
  public changelog_now: Changelog[][] = [];
  public svg_handle;
  public wait_multiple: number = 0;
  public animation_duration: number = 1000;
  public animation_duration_change: number = 6000;
  public changelog_display: any[] = [];
  public svg_height: number = 0;
  public svg_width: number = 0;
  public resizeSubscription: any;
  public mean_ratio: number = 1;
  public worst_ratio: number = 1;
  public std_ratio: number = 1;
  public best_ratio: number = 1;
  public side_opened: boolean = true;

  /**
   * Compute statistical measures of the aspect ratios of the given rectangles.
   * @param rectangles list of rectangles
   */
  private update_aspect_ratios(rectangles: RectNode[]) {
    let ratios: number[] = rectangles
      .map((el) => ratio(el.x1 - el.x0, el.y1 - el.y0))
      .filter((el) => !Number.isNaN(el) && Number.isFinite(el));
    this.mean_ratio = ratios.reduce((pv, el) => el + pv, 0) / ratios.length;
    this.worst_ratio = ratios.reduce((pv, el) => (el > pv ? el : pv), 1);
    this.std_ratio = Math.sqrt(
      ratios.reduce((pv, el) => Math.pow(el - this.mean_ratio, 2) + pv, 0) /
        (ratios.length - 1)
    );
    this.best_ratio = ratios.reduce(
      (pv, el) => (el < pv ? el : pv),
      Number.POSITIVE_INFINITY
    );
  }

  /**
   * change dataset. A request to the server is made
   * Index is the array of datasets
   * @param event the index of Index array (dropdown menu)
   */
  public update_to_new_chart(event) {
    this.isLoaded = false;
    //console.log(JSON.stringify(event));
    this.dfs
      .fetch_data('data/json/' + this.Index[event].name)
      .subscribe((data) => {
        [this.data, this.timesteps] = raw_data_to_trees(data);

        this.time_min = this.timesteps[0];
        this.time_max = this.timesteps[this.timesteps.length - 1];
        this.time_step = this.timesteps[1] - this.timesteps[0];
        this.index_time = +0;

        this.update_to_new_layout(this.selectedLayoutIndex);

        this.isLoaded = true;
      });

    this.reset_view();
  }

  constructor(private dfs: DataFetcherService) {
    this.Layouts = get_layout_names();
    this.changelog_display = [];
  }

  public reset_view() {
    this.changelog_display = [];
    if (this.playing) clearTimeout(this.timer);
    this.playing = false;
    this.index_time = 0;
    this.index_time_prev = 0;
    this.render(this.rectangles[this.index_time]);
  }

  public update_to_new_layout(event) {
    let i: number = event;
    [this.rectangles, this.changelog_now] = data_to_rectangles(
      this.data,
      this.Layouts[i].Name,
      this.svg_width,
      this.svg_height
    );
    this.reset_view();
  }

  public start() {
    this.wait_multiple = 0;

    if (!this.playing) {
      this.playing = true;

      let callback_timer = () => {
        let delay: number = 0;

        //console.log(this.wait_multiple);

        if (this.index_time+1 < this.timesteps.length) {
          if (this.changelog_now[this.index_time].length == 0)
            delay = this.animation_duration;
          else delay = this.animation_duration_change;
          this.changelog_display = this.changelog_now[this.index_time].map(
            (el) => {
              if (el.Type == 'Delete')
                return {
                  color: 'danger',
                  message:
                    'Deleted the node ' + el.Name + ' from ' + el.Path_before,
                };
              else if (el.Type == 'Create')
                return {
                  color: 'success',
                  message:
                    'Created the node ' + el.Name + ' in ' + el.Path_after,
                };
              else
                return {
                  color: 'warning',
                  message:
                    'Moved the node ' +
                    el.Name +
                    ' from ' +
                    el.Path_before +
                    ' to ' +
                    el.Path_after,
                };
            }
          );

          this.animate_new(
            this.rectangles[this.index_time],
            this.rectangles[this.index_time + 1],
            this.changelog_now[this.index_time].length > 0
          );

          this.index_time++;
          this.timer = setTimeout(callback_timer, delay);
        } else {
          //clearTimeout(this.timer);
          this.playing = false;
          this.changelog_display = [];
        }
      };

      callback_timer();
      //this.timer = setInterval(callback_timer, this.animation_duration * 1.1);
    }
  }

  public pause() {
    this.playing = false;
    clearTimeout(this.timer);
  }

  public update_index_time(event) {
    this.changelog_display = [];
    this.index_time_prev = this.index_time;
    this.index_time = +event.target.value;

    this.render(this.rectangles[this.index_time]);
  }

  ngOnInit() {
    this.svg_height = Math.round(window.innerHeight * 0.8);
    this.svg_width = window.innerWidth;

    this.svg_handle = d3.select('body').select('svg g');

    let resizeObservable = fromEvent(window, 'resize');
    let resizeSubscription = resizeObservable.subscribe((evt) => {
      this.svg_height = Math.round(window.innerHeight * 0.7);
      this.svg_width = window.innerWidth;
      [this.rectangles, this.changelog_now] = data_to_rectangles(
        this.data,
        this.Layouts[this.selectedLayoutIndex].Name,
        this.svg_width,
        this.svg_height
      );
      if (!this.playing) this.render(this.rectangles[this.index_time]);
    });

    this.dfs.fetch_index().subscribe((dta) => {
      this.Index = dta;
      this.selectedIndex = 0; // the defaults shown index is the first one whatever the first is
      this.dfs
        .fetch_data('data/json/' + this.Index[this.selectedIndex].name)
        .subscribe((data) => {
          [this.data, this.timesteps] = raw_data_to_trees(data); // convert to typscript riendly format

          this.time_min = this.timesteps[0];
          this.time_max = this.timesteps[this.timesteps.length - 1];
          this.time_step = this.timesteps[1] - this.timesteps[0];
          this.index_time = +0;

          this.update_to_new_layout(this.selectedLayoutIndex);

          this.isLoaded = true;
        });
    });
  }

  public animate_new_2(
    rectangles_start: RectNode[],
    rectangles_end: RectNode[]
  ) {
    this.update_aspect_ratios(rectangles_end);
  }

  public animate_new(
    rectangles_start: RectNode[],
    rectangles_end: RectNode[],
    modification: boolean
  ) {
    this.update_aspect_ratios(rectangles_end);

    let duration_this: number;
    if (modification) duration_this = this.animation_duration_change;
    else duration_this = this.animation_duration;

    var g = this.svg_handle
      .selectAll('.rect')
      .data(rectangles_end)
      .enter()
      .append('g')
      .classed('rect', true);

    if (modification == false) {
      render_no_change(
        rectangles_start,
        rectangles_end,
        duration_this,
        this.svg_handle,
        'rel'
      );
      return;
    }
    let creation_occurs = false; // flag that will be true if at least one node is created in this transition
    let deletion_occurs = false; // flag that will be true if at least one node gets deleted in this transition
    let rectangles_combined: any[] = rectangles_start.map((el, i) => {
      if (rectangles_end[i].transition == Change.Create) creation_occurs = true;
      if (rectangles_end[i].transition == Change.Delete) deletion_occurs = true;
      return { start: el, end: rectangles_end[i] };
    });

    d3.select('body')
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

        let ret: (t: number) => void = (t) => {};

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
      .duration(duration_this);

    /*d3.select('svg')
      .selectAll('text')
      .data(rectangles_start)
      .attr("class", "dotme")
      .attr("x", (d) => { return (d.x0 / 2 + d.x1 / 2).toString() + "%"; })
      .attr("y", (d) => { return (d.y0 / 2 + d.y1 / 2).toString() + "%"; })
      .attr("width", (d) => { return (d.x1-d.x0).toString()+"%"; } )
      .text(function (d) { return d.name + " - " + value_smart_print(d.value); });
*/
    let width = this.svg_width;
    let height = this.svg_height;

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
            if (t > 0)
              d3.select(this)
                .attr('x', d.end.x0.toString() + '')
                .attr('y', d.end.y0.toString() + '')
                .attr('width', (d.end.x1 - d.end.x0).toString() + '')
                .attr('height', (d.end.y1 - d.end.y0).toString() + '')
                .join('xhtml:div')
                .style('opacity', '1.0')
                .style('width', (d.end.x1 - d.end.x0).toString() + '')
                .style('height', (d.end.y1 - d.end.y0).toString() + '')
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
                .attr('innerHTML', display_text);
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
      .duration(duration_this);
  }

  public render(rectangles: RectNode[]) {
    //console.log(JSON.stringify(rectangles))
    this.update_aspect_ratios(rectangles);
    let width = this.svg_width;
    let height = this.svg_height;

    this.svg_handle.selectAll('g.rct').remove();
    d3.selectAll('g').remove();
    //var g = this.svg_handle
    var g = d3.select('svg').selectAll('.rect')
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
      .attr('height', (r) => {
        return (r.y1 - r.y0).toString() + '';
      })
      .attr('x', (r) => {
        return r.x0.toString() + '';
      })
      .attr('y', (r) => {
        return r.y0.toString() + '';
      })
      .attr('fill', (r) => {
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

    /*   g.append("text")
         .attr("text-anchor", "middle")
         .attr("fill", "white")
         .attr("x", (d) => { return (d.x0 / 2 + d.x1 / 2).toString() + "%"; })
         .attr("y", (d) => { return (d.y0 / 2 + d.y1 / 2).toString() + "%"; })
         //.attr("textLength", (d) => { return (d.x1-d.x0).toString()+"%"; } )
        // .attr("width", "1")
         .text((d) => {
           //let text = d3.select(this);
           return d.name + " - " + value_smart_print(d.value);
         });*/

    g.append('foreignObject')
      .attr('x', (d) => {
        return d.x0.toString() + '';
      })
      .attr('y', (d) => {
        return d.y0.toString() + '';
      })
      .attr('width', (d) => {
        return (d.x1 - d.x0).toString() + '';
      })
      .attr('height', (d) => {
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
      .html((d) => {
        if (Math.floor(d.y1 - d.y0) < 16 || Math.floor(d.x1 - d.x0) < 10)
          return '';
        else return d.name + ' - ' + value_smart_print(d.value);
      });
  }
}
