import { Component, Input } from '@angular/core';
import { DataFetcherService } from '../data-fetcher.service';
import { ActivatedRoute, Params } from '@angular/router';
import { IndexEntry } from '../index-entry';
import { RectNode, TreeMapNode, raw_data_to_trees } from '../tree-map-node';
import { value_smart_print } from '../extras';
import { NONE_TYPE } from '@angular/compiler';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.css'],
})
export class EditComponent {
  // @Input() name: string;
  public id: string = '';
  public Index: IndexEntry;
  public data: TreeMapNode[] = [];
  public timesteps: number[] = [];
  public selected_index: number = 0;
  public loaded: boolean = false;
  //public shown = new Map<string, boolean>();
  public shown = new Set<String>();

  // alerts
  message_error: string = '';
  message_success: string = '';
  show_error: boolean = false;
  show_success: boolean = false;

  public dismiss_error() {
    this.show_error = false;
    this.message_error = '';
  }

  public dismiss_success() {
    this.show_success = false;
    this.message_success = '';
  }
  constructor(private dfs: DataFetcherService, private route: ActivatedRoute) {
    this.Index = {} as IndexEntry;
  }

  public reload_data() {
    this.loaded = false;
    this.route.params.subscribe((params: Params) => {
      this.id = params['id'] as string;
      // now fetch index
      this.dfs.fetch_index().subscribe((dta) => {
        let tmp = dta.filter((el) => el.name == this.id);
        this.Index = tmp[0];
        this.dfs
          .fetch_data('data/json/' + this.Index.name)
          .subscribe((data) => {
            [this.data, this.timesteps] = raw_data_to_trees(data);
            this.loaded = true;
            this.refresh();
          });
      });
    });
  }

  ngOnInit() {
    this.reload_data();
  }

  public toggleHide(id: TreeMapNode) {
    for (let c of id.children)
      if (this.shown.has(c.name)) {
        this.shown.delete(c.name);
      } else this.shown.add(c.name);
  }

  public saveIndex() {
    console.log('Saving', this.Index);
    this.dfs.put_index(this.Index).subscribe({
      next: (data) => {
        // this.postId = data.id;
        this.message_success = 'Index saved';
        this.show_success = true;
      },
      error: (error) => {
        //this.errorMessage = error.message;
        console.error('There was an error!', error);
      },
    });
  }

  public selectTime(event: any) {
    this.selected_index = event.target.value;
    this.refresh();
  }

  public refresh() {
    for (let c of this.data[this.selected_index].children)
      this.shown.add(c.name);
  }

  public value_smart_print(n) {
    return value_smart_print(n);
  }

  public change_node_value(name, event) {
    console.log(name, event.target.value);
    let index_stack: number[] = [0];
    let level: number = 0;
  }

  private find_node(name: string, root: TreeMapNode) {
    if (root.name == name) return root;
    else {
      if (root.leaf) return null;
      for (let c of root.children) {
        let n = this.find_node(name, c);
        if (n != null) return n;
      }
    }
    return null;
  }
  private add_node_to_three(
    root: TreeMapNode,
    parent_name: string,
    name: string,
    value: number
  ) {
    let node: TreeMapNode = {
      name: root.name,
      value: root.value,
      hash: root.hash,
      lim_min: root.lim_min,
      lim_max: root.lim_max,
      children: [],
      leaf: root.leaf,
    };

    if (root.name == parent_name) {
      console.log("ADDED")
      node.children.push({
        name: name,
        value: value > 0 ? value : 0,
        hash: '',
        lim_min: 0,
        lim_max: 0,
        children: [],
        leaf: value > 0,
      } as TreeMapNode);
    }
    for (let c of root.children) {
      let tmp = this.add_node_to_three(c, parent_name, name, value);
      node.children.push(tmp as TreeMapNode);
    }
    return node;
  }

  public add_node(
    level: number,
    parent: string,
    name: string,
    value: number,
    leaf: boolean
  ) {
    console.log("Adding", name, leaf)
    if (leaf) {
      if (value <= 0 || name.length == 0) {
        this.show_error = true;
        this.message_error =
          'Adding a leaf must have a nonzero value and the name must contain at least 1 character.';
        return;
      }

      this.data[this.selected_index] = this.add_node_to_three(
        this.data[this.selected_index],
        parent,
        name,
        value
      ) as TreeMapNode;
    } else {
      if (name.length == 0) {
        this.show_error = true;
        this.message_error =
          'The name must contain at least 1 character.';
        return;
      }
      for (let i = 0; i < this.timesteps.length; i++){
        console.log(i);
        this.data[i] = this.add_node_to_three(
          this.data[i],
          level == 0 ? this.data[i].name : parent,
          name,
          -1
        ) as TreeMapNode;
      }
    }
  }

  private rebuild_tree_without_node(name: string, root: TreeMapNode) {
    if (root.name == name) return null;
    let node: TreeMapNode = {
      name: root.name,
      value: root.value,
      hash: root.hash,
      lim_min: root.lim_min,
      lim_max: root.lim_max,
      children: [],
      leaf: root.leaf,
    };

    if (root.leaf == false)
      for (let c of root.children) {
        let tmp = this.rebuild_tree_without_node(name, c);
        if (tmp != null) node.children.push(tmp);
      }

    return node;
  }

  public delete_this(name: string) {
    let ch = this.find_node(name, this.data[this.selected_index]);
    if (ch.leaf) {
      this.data[this.selected_index] = this.rebuild_tree_without_node(
        name,
        this.data[this.selected_index]
      ) as TreeMapNode;
    } else {
      for (let i = 0; i < this.timesteps.length; i++)
      {
        this.data[i] = this.rebuild_tree_without_node(
          name,
          this.data[i]
        ) as TreeMapNode;
        this.data[i]
      }
    }
  }

  public delete_until(name: string) {
    let ch = this.find_node(name, this.data[this.selected_index]);
    if (ch.leaf)
      for (let i = 0; i < this.selected_index; i++)
        this.data[i] = this.rebuild_tree_without_node(
          name,
          this.data[i]
        ) as TreeMapNode;
  }

  public delete_after(name: string) {
    let ch = this.find_node(name, this.data[this.selected_index]);
    if (ch.leaf)
      for (let i = this.selected_index + 1; i < this.timesteps.length; i++)
        this.data[i] = this.rebuild_tree_without_node(
          name,
          this.data[i]
        ) as TreeMapNode;
  }
}
