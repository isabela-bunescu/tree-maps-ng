import { Component, ViewChild } from '@angular/core';
import { AgChartOptions, AgTreemapSeriesOptions } from 'ag-charts-community';
import { AgChartsAngular } from 'ag-charts-angular';
import { getData } from './data';
import { HttpClient } from '@angular/common/http';
import { DataFetcherService } from '../data-fetcher.service';
import { hslToRgb, population_smart_print, tree_diff_v1 } from '../extras';
import { IndexEntry } from '../index-entry';

@Component({
  selector: 'app-tree-map-view',
  templateUrl: './tree-map-view.component.html',
  styleUrls: ['./tree-map-view.component.css']
})

export class TreeMapViewComponent {

  base_url: string = 'http://localhost:5000/';
  public options: AgChartOptions;
  @ViewChild(AgChartsAngular)
  public agChart!: AgChartsAngular;
  public isLoaded = false; // is loaded flag
  public data: any;
  public timesteps = [0, 0];
  public time_min = 0;
  public time_max = 0;
  public time_step = 0;
  public index_time:number  = 0;
  public index_time_prev: number = 0;
  public playing = false;
  public timer;
  public selectedIndex: number =0;
  public selectedValue: string = "";
  public Index: IndexEntry [] = [];

  constructor(private http: HttpClient, private dfs: DataFetcherService) {
    this.data = getData();

    this.options = {
      data: this.data,
      series: [
        {
          type: 'treemap',
          labelKey: 'name',
          gradient: false,
          nodePadding: 2,
          sizeKey: 'value',
          tileStroke: 'white',
          tileStrokeWidth: 1,
          labelShadow: {
            enabled: false,
          },
          groupFill: 'transparent',
          title: {
            color: 'black',
          },
          subtitle: {
            color: 'black',
          },
          labels: {
            value: {
              name: 'Population',
              formatter: (params) => {
                //let val = Math.round(params.datum.value/1000000);

                return population_smart_print(params.datum.value);
              },
            },
          },
          groupStrokeWidth: 0,
          highlightGroups: false,
          highlightStyle: {
            text: {
              color: undefined,
            },
          },
          /*formatter: ({ depth, parent, highlighted }) => {
            if (depth < 2) {
              return {};
            }
            var fill = 'rgb(32, 96, 224)';
            const stroke = highlighted ? 'black' : 'white';
            if (highlighted)
              fill = 'rgb(0,0,0)';
            return { fill, stroke };
          },*/
          formatter: (params) => {


            let h = (Math.round(360 * (params.datum.lim_max + params.datum.lim_min) / 2) + 60) % 360;

            let s = 50;
            let l = 50;
            let rgb = hslToRgb(h, s, l);

            var fill = 'rgb( ' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')'
            const stroke = params.highlighted ? 'black' : 'white';
            return { fill, stroke };
          },

        } as AgTreemapSeriesOptions,
      ],
      title: {
        text: '',
      },
      subtitle: {
        text: '',
      },

    };
  }

  ngOnInit() {
    this.dfs.callbackResponseIndex.subscribe(response => {
      this.Index = this.dfs.entries;
      this.selectedIndex = 0;
      this.dfs.get_data('data/json/'+this.Index[this.selectedIndex].name);
    });
    
    this.dfs.callbackResponse.subscribe(response => {
      
      this.data = this.dfs.data;
      //console.log(JSON.stringify(this.data));
      this.timesteps = this.dfs.timesteps;
      this.time_min = this.timesteps[0];
      this.time_max = this.timesteps[this.timesteps.length - 1];
      this.time_step = this.timesteps[1] - this.timesteps[0];
      this.index_time = +0;
      //console.log('result is: ', JSON.stringify(this.data[0].children, null, 4));
      var options = { ...this.options };
      options.data = { name: this.data[0].time, children: this.data[0].children };
      this.options = options;
      this.isLoaded = true;
      if(this.playing){
        clearInterval(this.timer);
        this.playing = false;
      }
      
    });
    

    //this.options.data = this.data[0].children;
    // set the flag to true to stop displaying the loading spinner and show the table.

  }

  public update_index_time(event){
   
    this.index_time_prev = this.index_time;
    this.index_time = +event.target.value;
    let diff = tree_diff_v1(this.data[this.index_time_prev], this.data[this.index_time], [""], []);
    console.log(JSON.stringify(diff));
    this.update(this.index_time);
  }
  public update(index) {
    var options = { ...this.options };
    options.data = { name: this.data[index].time, children: this.data[index].children };
    this.options = options;
    //console.log(JSON.stringify(this.data[time_index], null, 4))
  }

  public update_chart(event) {
    this.update(event.target.value);
  }

  public update_to_new_chart(event){
    this.isLoaded = false;
    //console.log(JSON.stringify(event));
    this.dfs.get_data('data/json/'+this.Index[event].name);
  }

  public start() {
    if (!this.playing) {
      this.playing = true;
      this.timer = setInterval(() => {
        
        if (this.index_time + 1 < this.timesteps.length) {
          
          this.index_time++;
          this.update(this.index_time);
        }
      }, 0.5 * 1000)
    }
  }

  public pause() {
    this.playing = false;
    clearInterval(this.timer);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  public async get_data(path: string) {

    this.http.get<any>(this.base_url + path).subscribe(dta => {
      this.data = dta;
      this.timesteps = this.data.map(el => {
        return el.time;
      });
      this.time_min = this.timesteps[0];
      this.time_max = this.timesteps[this.timesteps.length - 1];
      this.time_step = this.timesteps[1] - this.timesteps[0];
      //console.log('result is: ', JSON.stringify(this.data[0].children, null, 4));
      var options = { ...this.options };
      options.data = { name: this.data[0].time, children: this.data[0].children };
      this.options = options;
      // set the flag to true to stop displaying the loading spinner and show the table.
      this.isLoaded = true;
    });



  }
}
