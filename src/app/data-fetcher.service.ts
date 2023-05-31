import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, catchError, map, retry } from 'rxjs';
import {Md5} from 'ts-md5';
import { decorate_tree } from './extras';
import { IndexEntry } from './index-entry';

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
}
