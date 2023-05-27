import { tree } from 'd3';
import {Md5} from 'ts-md5';

export function decorate_tree(tree_root){
    let tree = decorate_tree_preliminary(tree_root);
    return decorate_tree_partition(tree, 0, 1);
    //return tree;
}

function decorate_tree_partition(tree_root, min, max){
    if(tree_root.hasOwnProperty("children")){
        let children = tree_root.children;
        let values = tree_root.children.map((el) => {return el.total_value/tree_root.total_value * (max-min);});
        //console.log(values);
        //console.log(values);
        let tmp = values.map((el, idx) => {return {value: el, idx: idx};});
        //console.log(tmp);
        tmp = tmp.sort((a,b) => {return -a.value+b.value;});

        let sofar:number = min;

        for(let j=0; j<children.length; j++){
            let i:number = tmp[j].idx
            let c = decorate_tree_partition(children[i], sofar, sofar + values[i]);
            sofar += values[i];
            children[i] = c;
        }
        tree_root.children = children;
        return {...tree_root, lim_min: min, lim_max: max};
      }
      else{
        // node is leaf
        return {...tree_root, lim_min: min, lim_max: max};
      }
}


function decorate_tree_preliminary(tree_root){

    // check if leaf
    if(tree_root.hasOwnProperty("children")){
      // node is not leaaf
      let children = tree_root.children.map((c) => { return decorate_tree_preliminary(c);});
      let values = children.map((el) => {return el.total_value;});
      let total_value = values.reduce((res, el) => {return res+el;}, 0);
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