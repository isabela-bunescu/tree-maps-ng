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
import { interp_lin, render_no_change, render_static, render_with_change } from '../renderer';
import { HighlightType } from 'src/layout-settings';
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
      this.svg_height = Math.round(window.innerHeight * 0.8);
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
        '#w1',
        HighlightType.Relative
      );
    }
    else{
      render_with_change(
        rectangles_start,
        rectangles_end,
        duration_this,
        '#w1');
    }
  }

  public render(rectangles: RectNode[]) {
    //console.log(JSON.stringify(rectangles))
    this.update_aspect_ratios(rectangles);
    let width = this.svg_width;
    let height = this.svg_height;

    render_static(rectangles, '#w1');
  }
}
