import { Component, Input } from '@angular/core';
import { DataFetcherService } from '../data-fetcher.service';
import { ActivatedRoute, Params } from '@angular/router';
import { IndexEntry } from '../index-entry';
import { TreeMapNode } from '../tree-map-node';

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
 constructor(private dfs: DataFetcherService, private route: ActivatedRoute) {
  this.Index = {} as IndexEntry;
 }

 ngOnInit(){
  this.route.params.subscribe((params: Params) => {
    this.id = params['id'] as string;
  });
 }
}
