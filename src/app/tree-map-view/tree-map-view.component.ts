import { Component, ViewChild } from '@angular/core';
import { AgChartOptions, AgTreemapSeriesOptions } from 'ag-charts-community';
import { AgChartsAngular } from 'ag-charts-angular';
import { getData } from './data';
import { HttpClient } from '@angular/common/http';

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
  public data : any;
  public timesteps = [0,0];
  public time_min = 0;
  public time_max = 0;
  public time_step = 0;
  public value = 0;

  constructor(private http: HttpClient) {
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
              formatter: (params) => `${params.datum.value/1000000}`,
            },
          },
          groupStrokeWidth: 0,
          highlightGroups: false,
          highlightStyle: {
            text: {
              color: undefined,
            },
          },
          formatter: ({ depth, parent, highlighted }) => {
            if (depth < 2) {
              return {};
            }
            var fill = 'rgb(32, 96, 224)';
            const stroke = highlighted ? 'black' : 'white';
            if (highlighted)
              fill = 'rgb(0,0,0)';
            return { fill, stroke };
          },
        } as AgTreemapSeriesOptions,
      ],
      title: {
        text: 'World\'s population',
      },
      subtitle: {
        text: 'in millions',
      },
      
    };
  }

  ngOnInit() { 
    this.get_data('generate_data'); 
    //this.options.data = this.data[0].children;
    // set the flag to true to stop displaying the loading spinner and show the table.
    
  }
  public update_chart(event){
    let time = event.target.value;
    let time_index = this.timesteps.indexOf(Number(time));
    console.log(this.timesteps);
    var options = {...this.options};
    options.data = {name: this.data[time_index].time, children: this.data[time_index].children};
    this.options = options;
  } 

  public async get_data(path :string){

    this.http.get<any>(this.base_url + path).subscribe(dta => { 
        this.data = dta;
        this.timesteps = this.data.map(el => {
          return el.time;
        });
        this.time_min = this.timesteps[0];
        this.time_max = this.timesteps[this.timesteps.length-1];
        this.time_step = this.timesteps[1]-this.timesteps[0];
        this.value = this.time_min;
        console.log('result is: ', JSON.stringify(this.data[0].children, null, 4));
        var options = {...this.options};
        options.data = {name: this.data[0].time, children: this.data[0].children};
        this.options = options;
        // set the flag to true to stop displaying the loading spinner and show the table.
        this.isLoaded = true;
      });
  
      /*
    const response = await fetch(this.base_url + path, {
      method: 'POST',
      body: "",
      headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'} });
    
    if (!response.ok) {
      console.log("GET DATA ERROR");
    }
    
    // If you care about a response:
    if (response.body !== null) {
      // body is ReadableStream<Uint8Array>
      // parse as needed, e.g. reading directly, or
      const result = (await response.json());
      //console.log('result is: ', JSON.stringify(result, null, 4));
      console.log(result[0].time);
      //const asString = new TextDecoder("utf-8").decode(response.body);
      // and further:
      //const asJSON = JSON.parse(asString);  // implicitly 'any', make sure to verify type on runtime.
      return result;
    }*/
    
  }
}
