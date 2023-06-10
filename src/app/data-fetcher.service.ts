import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, catchError, map, retry } from 'rxjs';
import {Md5} from 'ts-md5';
import { decorate_tree, diffs_to_changelog, tree_diff_v1, Changelog } from './extras';
import { IndexEntry } from './index-entry';
import { TreeMap } from '@amcharts/amcharts4/charts';
import { BuildTreeMap, RectNode, TreeConversion, TreeMapNode } from './tree-map-node';
import { rectangle } from '@amcharts/amcharts4/.internal/core/rendering/Path';

@Injectable({
  providedIn: 'root'
})

export class DataFetcherService {
  // backend address
  base_url: string = 'http://localhost:5000/';
  public data : any;
  public timesteps = [0,0];
  public callbackResponse = new Subject();
  public callbackResponseIndex = new Subject();
  public entries: IndexEntry[] = [];
  public data_tree: TreeMapNode[] = [];

  constructor(private http: HttpClient) {
    this.get_index();
  }

    private decorate_tree(tree_root){

        // check if leaf
        if(tree_root.hasOwnProperty("children")){
          // node is not leaaf
          let children = tree_root.children.map((c) => { return this.decorate_tree(c);});
          let values = children.map((el) => {return el.total_value;});
          let total_value = values.reduce((el) => {return el;});
          //let total_hash = children.reduce((result :string, current: any) => { return current.hash+result; }, "");
          let hashes = children.map((c) => {return c.hash; });
         // hashes.concat(Md5.hashStr(tree_root.name));
          hashes.sort();



          let total_hash = hashes.reduce((res, el) => {return res+el; }, "");
          return{name: tree_root.name, hash: Md5.hashStr(total_hash), total_value : total_value, children: children};
        }
        else{
          // node is leaf
          return {name: tree_root.name, total_value: tree_root.value, value: tree_root.value, hash: Md5.hashStr(tree_root.name)};
        }
    }


  public async get_index(){


      this.http.get<any>(this.base_url + "data/index").subscribe(dta => {
         this.entries = dta;
         this.callbackResponseIndex.next(true);
       });
  }

  public async get_data(path :string){

     this.http.get<any>(this.base_url + path).subscribe(dta => {
        let data = dta;
        //data = data.map((el) => {time: el.time, el.children.map(c=> {return this.decorate_tree(c)})});
        data = data.map((el)=>{ return {time: el.time, ...decorate_tree(el)}; });
        //console.log(JSON.stringify(data[0], null, 4));

        let timesteps = data.map(el => {
          return el.time;
        });
        this.data = data;
        this.timesteps = timesteps;
        this.callbackResponse.next(true);

      });



  }

  public data_as_tree(): TreeMapNode[]{
    let lst: TreeMapNode[] = [];
    for(let d of this.data)
      lst.push(TreeConversion(d));
    this.data_tree = lst;




    return lst;
  }

  public data_as_rectangles(layout: string): RectNode[][]{
      let changelogs: any[] = [];
      for(let i = 0; i < this.data.length - 1; i++)
      {
        let diff = tree_diff_v1(this.data[i], this.data[i+1], [], []);
        let changelog: Changelog[] = diffs_to_changelog(diff);
        changelogs.push(changelog);
      }

      let unique_names = new Set<string>();
      let rectangles: RectNode[][] = [];

      // build treemap and get list of names
      for(let i=0;i<this.data_tree.length; ++i){
        rectangles.push(BuildTreeMap(this.data_tree[i], "", {x0:0, x1: 100, y0: 0, y1: 100, slice: 0}));
        rectangles[i].map(el => { unique_names.add(el.name);});
      }

      // add unique names
      for(let i=0; i < this.data_tree.length; ++i){
        let to_add: string[] = [];
        unique_names.forEach((el) => {
          if(rectangles[i].filter((r)=> {return  r.name == el; }).length == 0)
            to_add.push(el);
        });
        for(let n in to_add)
          rectangles[i].push({name: n, value: 0, x0: 0, x1: 0, y0: 0, y1: 0, color: "white", color_h: 0, color_s: 0, color_l: 100} as RectNode);

      }

      // sort by name
      for(let i = 0; i < rectangles.length; i++)
        rectangles[i] = rectangles[i].sort((a,b) => {return a.name.localeCompare(b.name); });

      return rectangles;
    }
}
