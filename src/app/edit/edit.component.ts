import { Component, Input } from '@angular/core';
import { DataFetcherService } from '../data-fetcher.service';
import { ActivatedRoute, Params } from '@angular/router';
import { IndexEntry } from '../index-entry';
import { RectNode, TreeMapNode, raw_data_to_trees } from '../tree-map-node';
import { value_smart_print } from '../extras';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css']
})

export class EditComponent {
 // @Input() name: string;
 public id: string = "";
 public Index: IndexEntry;
 public data: TreeMapNode[] = [];
 public timesteps: number[] = [];
 public selected_index: number = 0;
 public loaded: boolean = false;
 //public shown = new Map<string, boolean>();
  public shown = new Set<String>();

 constructor(private dfs: DataFetcherService, private route: ActivatedRoute) {
  this.Index = {} as IndexEntry;
 }

 ngOnInit(){
  this.route.params.subscribe((params: Params) => {
    this.id = params['id'] as string;
    // now fetch index
    this.dfs.fetch_index().subscribe(dta => {
      let tmp = dta.filter((el) =>  el.name == this.id);
      this.Index = tmp[0];
      this.dfs.fetch_data('data/json/' + this.Index.name)
        .subscribe(data => {
          [this.data, this.timesteps] = raw_data_to_trees(data);
          this.loaded = true;
          this.refresh();
        });
    });
  });
 }

 public toggleHide(id: TreeMapNode){
  for(let c of id.children)
    if(this.shown.has(c.name))
    {
      this.shown.delete(c.name);
    }
    else
      this.shown.add(c.name);
 }

 public saveIndex(){

  console.log('Saving', this.Index);
 }

 public selectTime(event: any){
  console.log("EVENT ", event.target.value)
  this.selected_index = event.target.value;
  this.refresh();
 }

 public refresh(){
  for(let c of this.data[this.selected_index].children)
    this.shown.add(c.name);

 }

 public value_smart_print(n){
  return value_smart_print(n);
 }
}

