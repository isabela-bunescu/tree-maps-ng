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
import {
  interp_lin,
  render_no_change,
  render_static,
  render_with_change,
} from '../renderer';
import { HighlightType, LayoutSettings } from 'src/layout-settings';
//import { MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-tree-map-view-d3',
  templateUrl: './tree-map-view-d3.component.html',
  styleUrls: ['./tree-map-view-d3.component.css'],
})
export class TreeMapViewD3Component {
  // rectangles
  public rectangles_left: RectNode[][] = [];
  // time step description
  public timesteps = [0, 0];
  public time_min = 0;
  public time_max = 0;
  public time_step = 0;
  public index_time: number = 0;
  public index_time_prev: number = 0;
  // timer data (for animation)
  public playing = false;
  public timer;
  // layout data
  public layout_settings_left: LayoutSettings = new LayoutSettings();

  // dataset
  public isLoaded = false; // is loaded flag
  public data: TreeMapNode[] = [];
  public selectedIndex: number = 0;
  public selectedValue: string = '';
  public Index: IndexEntry[] = [];
  public changelog_now: Changelog[][] = [];
  public animation_duration: number = 1000;
  public animation_duration_change: number = 6000;
  public changelog_display: any[] = [];
  public svg_height: number = 0;
  public svg_width: number = 0;
  public resizeSubscription: any;
  public display_ratios: any = {
    mean_left: 1,
    mean_right: 1,
    weighted_left: 1,
    weighted_right: 1,
    worst_left: 1,
    worst_right: 1,
    std_left: 1,
    std_right: 1,
    best_left: 1,
    best_right: 1,
    not_showing_left: 0,
    not_showing_right: 0
  };
  public side_opened: boolean = true;

  /**
   * Compute statistical measures of the aspect ratios of the given rectangles.
   * @param rectangles_left list of rectangles of the left viewport
   * @param rectangles_right list of rectangles of the right viewport
   */
  private update_aspect_ratios(rectangles_left: RectNode[]) {
    let ratios: number[] = rectangles_left
      .map((el) => ratio(el.x1 - el.x0, el.y1 - el.y0))
      .filter((el) => !Number.isNaN(el) && Number.isFinite(el));
    this.display_ratios.not_showing_left = rectangles_left
      .map((el) => ratio(el.x1 - el.x0, el.y1 - el.y0))
      .filter((el) => Number.isNaN(el) || !Number.isFinite(el)).length;
    this.display_ratios.mean_left =
      ratios.reduce((pv, el) => el + pv, 0) / ratios.length;
    this.display_ratios.weighted_left =
      rectangles_left.reduce((pv, el) => {
        let r = ratio(el.x1 - el.x0, el.y1 - el.y0);
        if (!Number.isFinite(r) || Number.isNaN(r)) r = 0;
        return el.value * r + pv;
      }, 0) / rectangles_left.reduce((pv, el) => el.value + pv, 0);
    this.display_ratios.worst_left = ratios.reduce(
      (pv, el) => (el > pv ? el : pv),
      1
    );
    this.display_ratios.std_left = Math.sqrt(
      ratios.reduce(
        (pv, el) => Math.pow(el - this.display_ratios.mean_left, 2) + pv,
        0
      ) /
        (ratios.length - 1)
    );
    this.display_ratios.best_left = ratios.reduce(
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
        this.layout_settings_left.reference_tree_time = this.time_min;

        this.update_to_new_layout();

        this.isLoaded = true;
      });

    this.reset_view();
  }

  constructor(private dfs: DataFetcherService) {
    this.changelog_display = [];
  }

  public reset_view() {
    this.changelog_display = [];
    if (this.playing) clearTimeout(this.timer);
    this.playing = false;
    this.index_time = 0;
    this.index_time_prev = 0;
    this.render(this.index_time);
  }

  public update_to_new_layout() {
    [this.rectangles_left, this.changelog_now] = data_to_rectangles(
      this.data,
      this.layout_settings_left.layout_type,
      this.svg_width,
      this.svg_height,
      this.timesteps.indexOf(this.layout_settings_left.reference_tree_time)
    );
    this.reset_view();
  }

  public start() {
    if (!this.playing) {
      this.playing = true;

      let callback_timer = () => {
        let delay: number = 0;

        if (this.index_time + 1 < this.timesteps.length) {
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
            this.index_time,
            this.index_time + 1,
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

    this.render(this.index_time);
  }

  ngOnInit() {
    this.svg_height = Math.round(window.innerHeight * 0.8);
    this.svg_width = window.innerWidth - 20;

    // handle resize event
    let resizeObservable = fromEvent(window, 'resize');
    let resizeSubscription = resizeObservable.subscribe((evt) => {
      this.svg_height = Math.round(window.innerHeight * 0.8);
      this.svg_width = window.innerWidth - 20;
      [this.rectangles_left, this.changelog_now] = data_to_rectangles(
        this.data,
        this.layout_settings_left.layout_type,
        this.svg_width,
        this.svg_height,
        this.timesteps.indexOf(this.layout_settings_left.reference_tree_time)
      );

      if (!this.playing) this.render(this.index_time);
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
          this.layout_settings_left.reference_tree_time = this.time_min;

          this.update_to_new_layout();

          this.isLoaded = true;
        });
    });
  }

  public animate_new(
    time_index_start: number,
    time_index_end: number,
    modification: boolean
  ) {
    this.update_aspect_ratios(this.rectangles_left[time_index_end]);

    let duration_this: number;
    if (modification) duration_this = this.animation_duration_change;
    else duration_this = this.animation_duration;

    if (modification == false) {
      render_no_change(
        this.rectangles_left[time_index_start],
        this.rectangles_left[time_index_end],
        duration_this,
        'w1',
        this.layout_settings_left.highlight,
        this.layout_settings_left.color_scheme
      );
    } else {
      render_with_change(
        this.rectangles_left[time_index_start],
        this.rectangles_left[time_index_end],
        duration_this,
        'w1',
        this.layout_settings_left.color_scheme
      );
    }
  }

  public render(index: number) {
    //console.log(JSON.stringify(rectangles))
    this.update_aspect_ratios(this.rectangles_left[index]);
    let width = this.svg_width;
    let height = this.svg_height;

    render_static(
      this.rectangles_left[index],
      'w1',
      this.layout_settings_left.color_scheme
    );
  }
}
