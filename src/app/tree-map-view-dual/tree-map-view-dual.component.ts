import { Component } from '@angular/core';
import {
  render_no_change,
  render_static,
  render_with_change,
} from '../renderer';
import {
  RectNode,
  TreeMapNode,
  data_to_rectangles,
  get_layout_names,
  ratio,
  raw_data_to_trees,
} from '../tree-map-node';
import * as d3 from 'd3';
import { fromEvent } from 'rxjs';
import { DataFetcherService } from '../data-fetcher.service';
import { IndexEntry } from '../index-entry';
import { Changelog } from '../extras';

@Component({
  selector: 'app-tree-map-view-dual',
  templateUrl: './tree-map-view-dual.component.html',
  styleUrls: ['./tree-map-view-dual.component.css'],
})
export class TreeMapViewDualComponent {
  public isLoaded = false; // is loaded flag
  public data: TreeMapNode[] = [];
  // rectangles
  public rectangles_left: RectNode[][] = [];
  public rectangles_right: RectNode[][] = [];
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
  public layout_index_right: number = 0;
  public layout_index_left: number = 0;
  public Layouts: any[] = [];
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
    worst_left: 1,
    worst_right: 1,
    std_left: 1,
    std_right: 1,
    best_left: 1,
    best_right: 1,
  };
  public side_opened: boolean = true;

  /**
   * Compute statistical measures of the aspect ratios of the given rectangles.
   * @param rectangles_left list of rectangles of the left viewport
   * @param rectangles_right list of rectangles of the right viewport
   */
  private update_aspect_ratios(rectangles_left: RectNode[], rectangles_right: RectNode[]) {
    let ratios: number[] = rectangles_left
      .map((el) => ratio(el.x1 - el.x0, el.y1 - el.y0))
      .filter((el) => !Number.isNaN(el) && Number.isFinite(el));
    this.display_ratios.mean_left = ratios.reduce((pv, el) => el + pv, 0) / ratios.length;
    this.display_ratios.worst_left = ratios.reduce((pv, el) => (el > pv ? el : pv), 1);
    this.display_ratios.std_left = Math.sqrt(
      ratios.reduce((pv, el) => Math.pow(el - this.display_ratios.mean_left, 2) + pv, 0) /
        (ratios.length - 1)
    );
    this.display_ratios.best_left = ratios.reduce(
      (pv, el) => (el < pv ? el : pv),
      Number.POSITIVE_INFINITY
    );

    ratios = rectangles_right
      .map((el) => ratio(el.x1 - el.x0, el.y1 - el.y0))
      .filter((el) => !Number.isNaN(el) && Number.isFinite(el));
    this.display_ratios.mean_right = ratios.reduce((pv, el) => el + pv, 0) / ratios.length;
    this.display_ratios.worst_right = ratios.reduce((pv, el) => (el > pv ? el : pv), 1);
    this.display_ratios.std_right = Math.sqrt(
      ratios.reduce((pv, el) => Math.pow(el - this.display_ratios.mean_right, 2) + pv, 0) /
        (ratios.length - 1)
    );
    this.display_ratios.best_right = ratios.reduce(
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

        this.update_to_new_layout(this.layout_index_left, this.layout_index_right);

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
    this.render(this.index_time);
  }

  public update_to_new_layout(layout_left, layout_right) {
    [this.rectangles_left, this.changelog_now] = data_to_rectangles(
      this.data,
      this.Layouts[layout_left].Name,
      this.svg_width,
      this.svg_height
    );
    [this.rectangles_right, this.changelog_now] = data_to_rectangles(
      this.data,
      this.Layouts[layout_right].Name,
      this.svg_width,
      this.svg_height
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
    this.svg_width = window.innerWidth / 2 - 20;

    // handle resize event
    let resizeObservable = fromEvent(window, 'resize');
    let resizeSubscription = resizeObservable.subscribe((evt) => {
      this.svg_height = Math.round(window.innerHeight * 0.8);
      this.svg_width = window.innerWidth / 2 - 20;
      [this.rectangles_left, this.changelog_now] = data_to_rectangles(
        this.data,
        this.Layouts[this.layout_index_left].Name,
        this.svg_width,
        this.svg_height
      );
      [this.rectangles_right, this.changelog_now] = data_to_rectangles(
        this.data,
        this.Layouts[this.layout_index_right].Name,
        this.svg_width,
        this.svg_height
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

          this.update_to_new_layout(this.layout_index_left, this.layout_index_right);

          this.isLoaded = true;
        });
    });
  }

  public animate_new(
    time_index_start: number,
    time_index_end: number,
    modification: boolean
  ) {
    this.update_aspect_ratios(this.rectangles_left[time_index_end], this.rectangles_right[time_index_end]);

    let duration_this: number;
    if (modification) duration_this = this.animation_duration_change;
    else duration_this = this.animation_duration;

    if (modification == false) {
      render_no_change(
        this.rectangles_left[time_index_end],
        this.rectangles_left[time_index_end],
        duration_this,
        '#w1',
        'rel'
      );
      render_no_change(
        this.rectangles_right[time_index_end],
        this.rectangles_right[time_index_end],
        duration_this,
        '#w2',
        'rel'
      );
    } else {
      render_with_change(
        this.rectangles_left[time_index_end],
        this.rectangles_left[time_index_end],
        duration_this,
        '#w1'
      );
      render_with_change(
        this.rectangles_right[time_index_end],
        this.rectangles_right[time_index_end],
        duration_this,
        '#w2'
      );
    }
  }

  public render(index: number) {
    //console.log(JSON.stringify(rectangles))
    this.update_aspect_ratios(this.rectangles_left[index], this.rectangles_right[index]);
    let width = this.svg_width;
    let height = this.svg_height;

    render_static(this.rectangles_left[index], '#w1');
    render_static(this.rectangles_right[index], '#w2');
  }
}
