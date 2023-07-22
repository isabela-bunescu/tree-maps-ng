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

  // alerts
  message_error: string = "";
  message_success: string = "";
  show_error: boolean = false;
  show_success: boolean = false;

  public dismiss_error(){
    this.show_error = false;
    this.message_error = "";
  }

  public dismiss_success(){
    this.show_success = false;
    this.message_success = "";
  }
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
  this.dfs.put_index(this.Index)
  .subscribe({
    next: data => {
       // this.postId = data.id;
       this.message_success = "Index saved";
       this.show_success = true;
    },
    error: error => {
        //this.errorMessage = error.message;
        console.error('There was an error!', error);
    }
});
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

 public change_node_value(name, event){
  console.log(name, event.target.value);
  let index_stack: number[] = [0];
  let level: number = 0;

 }

 private find_node(name: string, root: TreeMapNode){
    if(root.name == name)
      return root;
    else{
      for(let c of root.children)
        return this.find_node(name, c);
    }
 }

 private rebuild_tree_without_node(name: string, root: TreeMapNode){

  for(let c of root.children)
    if(c.name != name)
      return ;
 }

 public delete_this(name: string){
  let ch = this.find_node(name, this.data[this.selected_index]);
  if(ch.leaf)
  {
   // this.data[this.selected_index] = this.rebuild_tree_without_node(name, this.data[this.selected_index]);
  }
  else
  {
    //for(let i = 0; i < this.timesteps.length; i++)
   //   this.data[i] = this.rebuild_tree_without_node(name, this.data[i]);
  }
 }

 public delete_until(name: string){

 }

 public delete_after(name: string){

 }
}

