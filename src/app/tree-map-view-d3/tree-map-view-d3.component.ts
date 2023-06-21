import { Component } from '@angular/core';
import * as d3 from 'd3';
import { DataFetcherService } from '../data-fetcher.service';
import { IndexEntry } from '../index-entry';
import { Changelog, hslToRgb, population_smart_print } from '../extras';
import { Change, RectNode, TreeMapNode, data_to_rectangles, get_layout_names, raw_data_to_trees } from '../tree-map-node';
import { BuildTreeMap } from '../tree-map-node';
import { Text } from '@visx/text';

@Component({
  selector: 'app-tree-map-view-d3',
  templateUrl: './tree-map-view-d3.component.html',
  styleUrls: ['./tree-map-view-d3.component.css']
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
  public selectedValue: string = "";
  public Index: IndexEntry[] = [];
  public changelog_now: Changelog[][] = [];
  public svg_handle;
  public wait_multiple: number = 0;
  public animation_duration: number = 1000;
  public animation_duration_change: number = 1000;
  public changelog_display: any[] = [];

/**
 * change dataset. A request to the server is made
 * Index is the array of datasets
 * @param event the index of Index array (dropdown menu)
 */
  public update_to_new_chart(event) {
    this.isLoaded = false;
    //console.log(JSON.stringify(event));
    this.dfs.fetch_data('data/json/' + this.Index[event].name)
      .subscribe(data => {

        [this.data, this.timesteps] = raw_data_to_trees(data);
        console.log(this.data);
        console.log(this.Layouts);
        [this.rectangles, this.changelog_now] = data_to_rectangles(this.data, this.Layouts[0].Name);
        this.selectedLayoutIndex = 0;
        //console.log(JSON.stringify(this.data));

        this.time_min = this.timesteps[0];
        this.time_max = this.timesteps[this.timesteps.length - 1];
        this.time_step = this.timesteps[1] - this.timesteps[0];
        this.index_time = +0;
        //console.log('result is: ', JSON.stringify(this.data, null, 4));

        this.isLoaded = true;
        //console.log(JSON.stringify(this.data[0]));
        this.render(this.rectangles[this.index_time]);
        if (this.playing) {
          clearInterval(this.timer);
          this.playing = false;
        }

      });



    this.reset_view();
  }

  constructor(private dfs: DataFetcherService) {
    this.Layouts = get_layout_names();
    this.changelog_display = [];
  }

  public reset_view() {
    this.changelog_display = [];
    clearInterval(this.timer);
    this.playing = false;
    this.index_time = 0;
    this.index_time_prev = 0;
    this.render(this.rectangles[this.index_time]);
  }

  public update_to_new_layout(event) {
    let i: number = event;
    [this.rectangles, this.changelog_now] = data_to_rectangles(this.data, this.Layouts[i].Name);
    this.reset_view();
  }



  public start() {
    this.wait_multiple = 0;
    this.animation_duration_change = 6*this.animation_duration;
    if (!this.playing) {
      this.playing = true;

      let callback_timer = () => {
        if(this.changelog_now[this.index_time].length == 0)
          this.wait_multiple = 0;
        else
          this.wait_multiple ++;
        if(this.wait_multiple == 6) {  this.index_time++; this.wait_multiple = 0; return;}
        if(this.wait_multiple > 1) return;

        //console.log(this.wait_multiple);

        if (this.index_time + 1 < this.timesteps.length) {

          this.changelog_display = this.changelog_now[this.index_time].map(el => {
            if (el.Type == "Delete")
              return { color: "danger", message: "Deleted the node " + el.Name + " from " + el.Path_before };
            else if (el.Type == "Create")
              return { color: "success", message: "Created the node " + el.Name + " in " + el.Path_after };
            else
              return { color: "warning", message: "Moved the node " + el.Name + " from " + el.Path_before + " to " + el.Path_after };
          }
          );

          this.animate_new(this.rectangles[this.index_time], this.rectangles[this.index_time + 1], this.changelog_now[this.index_time].length > 0 );

          if(this.changelog_now[this.index_time].length == 0 || this.changelog_now[this.index_time].length == 6)
            this.index_time++;

        }
        else {
          clearInterval(this.timer);
          this.playing = false;
          this.changelog_display = [];
        }
      }

      callback_timer();
      this.timer = setInterval(callback_timer, this.animation_duration * 1.1);
    }
  }

  public pause() {
    this.playing = false;
    clearInterval(this.timer);
  }

  public update_index_time(event) {
    this.changelog_display = [];
    this.index_time_prev = this.index_time;
    this.index_time = +event.target.value;

    this.render(this.rectangles[this.index_time]);
  }

  ngOnInit() {


    this.svg_handle = d3.select("body").select("svg g");



    this.dfs.fetch_index().subscribe(dta => {
      this.Index = dta;
      this.selectedIndex = 0;
      this.dfs.fetch_data('data/json/' + this.Index[this.selectedIndex].name)
        .subscribe(data => {

          [this.data, this.timesteps] = raw_data_to_trees(data);
          console.log(this.data);
          console.log(this.Layouts);
          [this.rectangles, this.changelog_now] = data_to_rectangles(this.data, this.Layouts[0].Name);

          //console.log(JSON.stringify(this.data));

          this.time_min = this.timesteps[0];
          this.time_max = this.timesteps[this.timesteps.length - 1];
          this.time_step = this.timesteps[1] - this.timesteps[0];
          this.index_time = +0;
          //console.log('result is: ', JSON.stringify(this.data, null, 4));

          this.isLoaded = true;
          //console.log(JSON.stringify(this.data[0]));
          this.render(this.rectangles[this.index_time]);
          if (this.playing) {
            clearInterval(this.timer);
            this.playing = false;
          }

        });
    });





  }

  public animate_new(rectangles_start: RectNode[], rectangles_end: RectNode[], modification: boolean) {
    let duration_this: number;
    if(modification)
      duration_this = this.animation_duration_change;
    else
      duration_this = this.animation_duration;
    var g = this.svg_handle.selectAll(".rect")
      .data(rectangles_end)
      .enter()
      .append("g")
      .classed('rect', true)

    let rectangles_combined = rectangles_start.map((el, i) => { return { start: el, end: rectangles_end[i] }; });

    d3.select('svg')
      .selectAll('rect')
      .data(rectangles_combined)
      .transition()
      .attr("id", (r) => { return "#" + r.end.name; })
      //.attr("width", (r: any) => { return (r.end.x1 - r.end.x0).toString() + "%"; })
      //.attr("height", (r) => { return (r.end.y1 - r.end.y0).toString() + "%"; })
      //.attr("x", (r) => { return (r.end.x0).toString() + "%"; })
      //.attr("y", (r) => { return (r.end.y0).toString() + "%"; })
      //.attr("fill", (r) => { let rgb = hslToRgb(r.end.color_h, r.end.color_s, r.end.color_l); return "rgb(" + Math.round(rgb[0]) + ", " + Math.round(rgb[1]) + ", " + Math.round(rgb[2]) + ")"; })
      .duration(duration_this)
      .tween('coloring', function (d) {
        let currentAngle = d.start.color_h;
        let targetAngle = d.end.color_h;

        //shortest path on the hue circle
        if (targetAngle - currentAngle > 180) {
          targetAngle -= 360;
        }
        else if (targetAngle - currentAngle < -180) {
          targetAngle += 360;
        }

        let interp_lin = (t: number, t0: number, t1: number, y0: number, y1: number) => { return (t >= t0 && t <= t1) ? y0 + (t - t0) / (t1 - t0) * (y1 - y0) : (t < t0 ? y0 : y1); }; // ramp function ___/------
        let interp_hat = (t: number, t0: number, t1: number, t2: number, y0: number, y1: number, y2: number) => { return (t >= t0 && t <= t1) ? y0 + (t - t0) / (t1 - t0) * (y1 - y0) : ((t > t1 && t <= t2) ? y1 + (t - t1) / (t2 - t1) * (y2 - y1) : (t < t0 ? y0 : y2)); }; // ramp function ___/------

        let ret: (t: number) => void = (t) => { };


        if (d.end.transition == Change.Delete) {
          //i_h = d3.interpolate(currentAngle, currentAngle);
          //i_l = (t) => { return t < 1/3 ? 100*Math.sin(9*Math.PI/4*t+Math.PI/4) : 0; };
          ret = (t) => {
            let hue_angle = d.start.color_h;
            let lum = Math.round(interp_hat(t, 0, 1 / 6-1/20, 1 / 3-1/20, d.start.color_l, 0, 50));
            let alpha: number = interp_lin(t, 1/6-1/20, 1 / 3-1/20, d.start.color_a, 0.0);
            d3.select(this)
              .attr('fill', "hsla(" + hue_angle + ", " + d.end.color_s + "%, " + lum + "%, " + alpha + ")")
          }

        }
        else if (d.end.transition == Change.Create) {
          ret = (t) => {

            let hue_angle = d.end.color_h;
            let sat = Math.round(interp_hat(t, 2 / 3+1/10, 2 / 3 + 1 / 6, 1, d.end.color_s, 100, d.end.color_s));
            let alpha: number = interp_lin(t, 2 / 3+1/10, 2/3+2/10, 0.0, 1.0);
            //console.log(hue_angle, sat, alpha)
            d3.select(this)
              .attr('fill', "hsla(" + hue_angle + ", " + sat + "%, " + d.end.color_l + "%, " + alpha + ")")
              .attr("x", d.end.x0.toString() + "%")
              .attr("y", d.end.y0.toString() + "%")
              .attr("width", (d.end.x1-d.end.x0).toString() + "%")
              .attr("height", (d.end.y1-d.end.y0).toString() + "%")
          }
        }
        else if (d.end.transition == Change.Move) {
          ret = (t) => {
            let hue_angle: number = Math.round(interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, currentAngle, targetAngle)) % 360;
            let x: number = interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, d.start.x0, d.end.x0);
            let y: number = interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, d.start.y0, d.end.y0);
            let w: number = interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, d.start.x1 - d.start.x0, d.end.x1 - d.end.x0);
            let h: number = interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, d.start.y1 - d.start.y0, d.end.y1 - d.end.y0);
            let sat: number = interp_hat(t, 1 / 3+1/20, 1 / 6, 2 / 3-1/20, d.start.color_l, 100, d.end.color_l);

            d3.select(this)
              .attr('fill', "hsla(" + hue_angle + ", " + sat + "%, " + d.end.color_l + "%, " + d.start.color_a + ")")
              .attr("x", x.toString() + "%")
              .attr("y", y.toString() + "%")
              .attr("width", w.toString() + "%")
              .attr("height", h.toString() + "%")
          }
        } else // if (d.end.transition == Change.None)
        {
          ret = (t) => {
            let hue_angle: number = Math.round(interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, currentAngle, targetAngle)) % 360;
            let x: number = interp_lin(t, 1 / 3+1/20, 2 / 3, d.start.x0, d.end.x0);
            let y: number = interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, d.start.y0, d.end.y0);
            let w: number = interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, d.start.x1 - d.start.x0, d.end.x1 - d.end.x0);
            let h: number = interp_lin(t, 1 / 3+1/20, 2 / 3-1/20, d.start.y1 - d.start.y0, d.end.y1 - d.end.y0);

            d3.select(this)
              .attr('fill', "hsla(" + hue_angle + ", " + d.end.color_s + "%, " + d.end.color_l + "%, " + d.start.color_a + ")")
              .attr("x", x.toString() + "%")
              .attr("y", y.toString() + "%")
              .attr("width", w.toString() + "%")
              .attr("height", h.toString() + "%")
          }
        }

        return ret; /*
        return function(t) {
          let hue_angle = Math.round(i_h(t)) % 360;
          let lum = i_l(t);

          d3.select(this)
            .attr('fill', "hsl(" + hue_angle + " " + d.end.color_s + "% "+lum+"% )")
        }*/
      });

    d3.select('svg')
      .selectAll('text')
      .data(rectangles_start)
      .attr("class", "dotme")
      .attr("x", (d) => { return (d.x0 / 2 + d.x1 / 2).toString() + "%"; })
      .attr("y", (d) => { return (d.y0 / 2 + d.y1 / 2).toString() + "%"; })
      .attr("width", (d) => { return (d.x1-d.x0).toString()+"%"; } )
      .text(function (d) { return d.name + " - " + population_smart_print(d.value); });

  }
 /* public dottext(text: any){


      text.each(function() {
          var text = d3.select(this);
          var words = text.text().split(/\s+/);

          var ellipsis = text.text('').append('tspan').attr('class', 'elip').text('...');
          var width = parseFloat(text.attr('width')) - ellipsis.node().getComputedTextLength();
          var numWords = words.length;

          var tspan = text.insert('tspan', ':first-child').text(words.join(' '));

          // Try the whole line
          // While it's too long, and we have words left, keep removing words

          while (tspan.node().getComputedTextLength() > width && words.length) {
              words.pop();
              tspan.text(words.join(' '));
          }

          if (words.length === numWords) {
              ellipsis.remove();
          }
      });
  }*/



  public animate(rectangles_start: RectNode[], rectangles_end: RectNode[]) {

    //this.svg_handle.selectAll(".rect").remove()



    var g = this.svg_handle.selectAll(".rect")
      .data(rectangles_end)
      .enter()
      .append("g")
      .classed('rect', true)


    d3.select('svg')
      .selectAll('rect')
      .data(rectangles_end)
      .transition()
      .attr("id", (r) => { return "#" + r.name; })
      .attr("width", (r: RectNode) => { return (r.x1 - r.x0).toString() + "%"; })
      .attr("height", (r) => { return (r.y1 - r.y0).toString() + "%"; })
      .attr("x", (r) => { return (r.x0).toString() + "%"; })
      .attr("y", (r) => { return (r.y0).toString() + "%"; })
      .attr("fill", (r) => { let rgb = hslToRgb(r.color_h, r.color_s, r.color_l); return "rgba(" + Math.round(rgb[0]) + ", " + Math.round(rgb[1]) + ", " + Math.round(rgb[2]) + ", 1.0)"; })
      .duration(this.animation_duration);

    d3.select('svg')
      .selectAll('text')
      .data(rectangles_start)
      .attr("x", (d) => { return (d.x0 / 2 + d.x1 / 2).toString() + "%"; })
      .attr("y", (d) => { return (d.y0 / 2 + d.y1 / 2).toString() + "%"; })
      //.attr("textLength", (d) => { return (d.x1-d.x0).toString()+"%"; } )
      .attr("dy", ".35em")
      .text(function (d) { return d.name + " - " + population_smart_print(d.value); });

    // .attr("width", "400")
    //                       .transition()
    //.duration(2000)
    //.attr("width", "400")


  }
  public render(rectangles: RectNode[]) {
    //console.log(JSON.stringify(rectangles))


    this.svg_handle.selectAll(".rect").remove()

    var g = this.svg_handle.selectAll(".rect")
      .data(rectangles)
      .enter()
      .append("g")
      .classed('rect', true)

    let tooltip = g.select('svg')
      .append('div')
      //.style("opacity", 1)
      // .attr("class", "tooltip")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "2px")
      .style("border-radius", "5px")
      .style("padding", "5px")


    g.append("rect")
      .attr("id", (r) => { return "#" + r.name; })
      .attr("width", (r: RectNode) => { return (r.x1 - r.x0).toString() + "%"; })
      .attr("height", (r) => { return (r.y1 - r.y0).toString() + "%"; })
      .attr("x", (r) => { return (r.x0).toString() + "%"; })
      .attr("y", (r) => { return (r.y0).toString() + "%"; })
      .attr("fill", (r) => { let rgb = hslToRgb(r.color_h, r.color_s, r.color_l); return "rgba(" + Math.round(rgb[0]) + ", " + Math.round(rgb[1]) + ", " + Math.round(rgb[2]) + ", 1.0)"; })
      .on("mouseover", function (d) {

        var xPosition = 50;
        var yPosition = 50;
        d3.select("#tooltip")
          .style("left", xPosition + "%")
          .style("top", yPosition + "%")
          .select("#value")
          .text(d.name);
        d3.select("#tooltip").classed("hidden", false);
      })
      .on("mouseout", function () {
        d3.select("#tooltip").classed("hidden", true);
      })

    g.append("text")
      //.attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("x", (d) => { return (d.x0 / 2 + d.x1 / 2).toString() + "%"; })
      .attr("y", (d) => { return (d.y0 / 2 + d.y1 / 2).toString() + "%"; })
      //.attr("textLength", (d) => { return (d.x1-d.x0).toString()+"%"; } )
     // .attr("width", "1")
      .text((d) => {
        //let text = d3.select(this);
        return d.name + " - " + population_smart_print(d.value);
      });



  }

}
