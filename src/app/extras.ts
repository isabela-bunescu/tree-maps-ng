import { tree } from 'd3';
import {Md5} from 'ts-md5';

export interface Diff{
  Path: string[],
  LeafName: string,
  Type: number
}

export interface Changelog{
  Type: string,  // can be "Create", "Delete", "Move"
  Name: string,
  Path_before: string[],
  Path_after: string[]
}


export function decorate_tree(tree_root){
    let tree = decorate_tree_preliminary(tree_root);
    return decorate_tree_partition(tree, 0, 1);
    //return tree;
}

/**
 * Decorates a tree by partitioning its values based on given minimum and maximum limits.
 * @param tree_root - The root of the tree to be decorated.
 * @param min - The minimum limit for partitioning.
 * @param max - The maximum limit for partitioning.
 * @returns The decorated tree with partitioned values.
 */
function decorate_tree_partition(tree_root, min, max){
    if(tree_root.hasOwnProperty("children")){
        let children = tree_root.children;

        // Calculate values for each child based on the total value of the parent
        let values = tree_root.children.map((el) => {return el.total_value/tree_root.total_value * (max-min);});

        // Sort the values in descending order along with their respective indices
        let tmp = values.map((el, idx) => {return {value: el, idx: idx};});
        tmp = tmp.sort((a,b) => {return -a.value+b.value;});

        let sofar:number = min;

        for(let j=0; j<children.length; j++){
            let i:number = tmp[j].idx;

            // Recursively decorate each child with new partition limits
            let c = decorate_tree_partition(children[i], sofar, sofar + values[i]);
            sofar += values[i];
            children[i] = c;
        }

        // Update the children of the tree root with the decorated children and return the updated tree
        tree_root.children = children;
        return {...tree_root, lim_min: min, lim_max: max};
    }
    else{
        // Node is a leaf, simply add the partition limits to the leaf node and return it
        return {...tree_root, lim_min: min, lim_max: max};
    }
}

/**
 * Decorates a tree structure by calculating and assigning values to each node.
 * @param tree_root The root node of the tree.
 * @returns The decorated tree with assigned values.
 */
function decorate_tree_preliminary(tree_root) {
    if (tree_root.hasOwnProperty("children")) {
        let children = tree_root.children.map((c) => { return decorate_tree_preliminary(c); });
        let values = children.map((el) => { return el.total_value; });
        let total_value = values.reduce((res, el) => { return res + el; }, 0);
        let hashes = children.map((c) => { return c.hash; });
        hashes.sort();
        let total_hash = hashes.reduce((res, el) => { return res + el; }, "");
        return {
            name: tree_root.name,
            hash: Md5.hashStr(total_hash),
            total_value: total_value,
            children: children
        };
    }
    else {
        return {
            name: tree_root.name,
            total_value: tree_root.value,
            value: tree_root.value,
            hash: Md5.hashStr(tree_root.name)
        };
    }
}

/**
 * Converts HSL (Hue, Saturation, Lightness) color values to RGB (Red, Green, Blue) format.
 * @param h - Hue value in the range [0, 360].
 * @param s - Saturation value in the range [0, 100].
 * @param l - Lightness value in the range [0, 100].
 * @returns An array containing the RGB values as numbers in the range [0, 255] in the order [red, green, blue].
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  // Convert HSL values to the range [0, 1]
  const hue = h / 360;
  const saturation = s / 100;
  const lightness = l / 100;

  // Calculate intermediate values
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue * 6;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const m = lightness - chroma / 2;

  let red = 0, green = 0, blue = 0;

  // Determine RGB values based on the hue sector
  if (0 <= huePrime && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (1 <= huePrime && huePrime < 2) {
    red = x;
    green = chroma;
  } else if (2 <= huePrime && huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (3 <= huePrime && huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (4 <= huePrime && huePrime < 5) {
    red = x;
    blue = chroma;
  } else if (5 <= huePrime && huePrime < 6) {
    red = chroma;
    blue = x;
  }

  // Adjust RGB values by adding the lightness offset
  red = Math.round((red + m) * 255);
  green = Math.round((green + m) * 255);
  blue = Math.round((blue + m) * 255);

  return [red, green, blue];
}

/**
 * Takes a number n as input and returns a formatted string representing the value in a smart-print format.
 * @param n 
 * @returns 
 */
export function value_smart_print(n: number){

  if(n < 900)
  {
    return n.toString();
  }
  if(n >=900 && n < 10000)
  {
    let N = (n/1000).toFixed(2);
    return N.toString()+' k';
  }
  if(n >=10000 && n < 500000)
  {
    let N = (n/1000).toFixed(1);
    return N.toString()+' k';
  }
  if(n>=500000 && n<10000000)
  {
    let N = (n/1000000).toFixed(2);
    return N.toString()+' M';
  }
  if(n>=10000000 && n<900000000)
  {
    let N = (n/1000000).toFixed(1);
    return N.toString()+' M';
  }
  if(n >= 900000000 )
  {
    let N = (n/1000000000).toFixed(2);
    return N.toString()+' B';
  }
  return "0"

}


/**
 * Calculates the differences between 2 tree structures represented by t1 and t2
 * @param t1 
 * @param t2 
 * @param path 
 * @param diff 
 * @returns 
 */
export function tree_diff_v1(t1, t2, path: string[], diff: any[]){
  if(!t1.hasOwnProperty("children") && !t2.hasOwnProperty("children"))
    return diff;
  if(t1.hash!=t2.hash)
  {
    if(t1.children[0].hasOwnProperty('children')){
      for(let i = 0; i < t1.children.length; i++)
      {
        if(t1.children[i].hash != t2.children[i].hash)
        {
          let path_new = [...path];
          path_new.push(t1.children[i].name);

          tree_diff_v1(t1.children[i], t2.children[i], path_new, diff);
        }
      }
    }
    else{
      let s1 =t1.children.map(c=>{return c.name;});
      let s2 = t2.children.map(c=>{return c.name;});

      let diff12 = s1.filter(x => !s2.includes(x));
      let diff21 = s2.filter(x => !s1.includes(x));

      for (var leaf of diff12){
        diff.push({Path: path, LeafName: leaf, Type: -1} as Diff);
      }
        //diff.push(["-", leaf.name, ...path]);
      for (var leaf of diff21)
       diff.push({Path: path, LeafName: leaf, Type: 1} as Diff);
      // diff.push(["+", leaf.name, ...path]);
      //console.log(JSON.stringify(path), diff12, diff21);
    }
    return diff;

  }
  else
    return diff;

}

/**
 * Converts a list of diffs into a changelog.
 *
 * @param diffs - The list of diffs to be converted.
 * @returns An array of changelog entries.
 */
export function diffs_to_changelog(diffs: Diff[]): Changelog[] {
  let so_far: string[] = [];
  let changelog: Changelog[] = [];

  diffs.forEach((diff) => {
    if (!so_far.includes(diff.LeafName)) {
      var type = diff.Type;
      var entries = diffs.filter((d) => {
        return d.LeafName == diff.LeafName;
      });

      if (entries.length == 2 && entries[0].Type * entries[1].Type < 0) {
        // Move entry
        changelog.push({
          Type: "Move",
          Name: diff.LeafName,
          Path_before: entries[0].Type < 0 ? entries[0].Path : entries[1].Path,
          Path_after: entries[0].Type < 0 ? entries[0].Path : entries[1].Path,
        });
      }

      if (entries.length == 1) {
        // Create or delete entry
        changelog.push({
          Type: diff.Type < 0 ? "Delete" : "Create",
          Name: diff.LeafName,
          Path_before: diff.Type < 0 ? diff.Path : [],
          Path_after: diff.Type < 0 ? [] : diff.Path,
        });
      }

      so_far.push(diff.LeafName);
    }
  });

  return changelog;
}