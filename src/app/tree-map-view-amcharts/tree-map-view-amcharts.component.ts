import { Component } from '@angular/core';
import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import { DataFetcherService } from '../data-fetcher.service';

@Component({
  selector: 'app-tree-map-view-amcharts',
  templateUrl: './tree-map-view-amcharts.component.html',
  styleUrls: ['./tree-map-view-amcharts.component.css']
})
export class TreeMapViewAmchartsComponent {
  public chart! : am4charts.TreeMap;
  public isLoaded = false; // is loaded flag
  public data : any;
  public timesteps = [0,0];
  public time_min = 0;
  public time_max = 0;
  public time_step = 0;
  public value = 0;
  public playing = false;
  
  constructor(private dfs: DataFetcherService) {
    
    
  }

  ngOnInit(){
    this.dfs.get_data('/data/json/world-population-normal');
    // define the relevant data fields
    this.chart = am4core.create("chartdiv", am4charts.TreeMap);
   
    this.dfs.callbackResponse.subscribe(() => {
        this.data = this.dfs.data;
        this.timesteps = this.dfs.timesteps;
        this.time_min = this.timesteps[0];
        this.time_max = this.timesteps[this.timesteps.length-1];
        this.time_step = this.timesteps[1]-this.timesteps[0];
        this.value = this.time_min;
        console.log('result is: ', JSON.stringify(this.data[0].children, null, 4));
          
        this.isLoaded = true;
        
        this.chart.data = this.data[0].children;
        this.chart.dataFields.value = "value";
        this.chart.dataFields.name = "name";
        this.chart.dataFields.children = "children";
        this.chart.maxLevels = 5;
        //this.chart.draw();

        let level1 = this.chart.seriesTemplates.create("1");
        let level1_bullet = level1.bullets.push(new am4charts.LabelBullet());
        level1_bullet.locationY = 0.5;
        level1_bullet.locationX = 0.5;
        level1_bullet.label.text = "{name}: {value}";
        level1_bullet.label.fill = am4core.color("#fff");
        
     });
  }

  public start(){
    this.playing = true;
  }

  public update_chart(event){
    let time = event.target.value;
    let time_index = this.timesteps.indexOf(Number(time));
    console.log(this.timesteps);
    this.chart.data = this.data[time_index].children;

   
  } 


}
