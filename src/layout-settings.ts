export enum ColorScheme {
  HSL = 0,
  LCH = 1,
}

export enum LayoutType{
  SD_V = 0,
  SD_H = 1,
  SD_A = 2,
  SQ_MAX = 3,
  SQ_MEAN = 4,
  SP_ASC = 5,
  SP_DES = 6,
  SP_ASC_CONT = 7,
  SP_DES_CONT = 8
}

export enum HighlightType{
  None = 0,
  Relative = 1,
  Absolute = 2
}



export class LayoutSettings {
  public layout_type: number = 0;
  public color_scheme: ColorScheme = ColorScheme.HSL;
  public highlight: HighlightType = 1;
  public reference_tree_time: number = 0;
  public text_highlight: boolean = true;

  readonly color_scheme_names: string[] = ['HSL', 'LCH'];

  readonly layout_names: string[] = [
    'Slice & dice horizontal',
    'Slice & dice vertical',
    'Slice & dice automatic',
    'Squarify (maximum)',
    'Squarify (mean)',
    'Spiral ascending',
    'Spiral descending',
    'Spiral ascending continous',
    'Spiral descending continous',
  ];

  readonly highlight_names: string[] = [
    'None',
    'Relative',
    'Absolute'
  ];

  readonly layout_descriptions: string[] = [
    'Slice and dice algorithm starting with horizontal division.',
    'Slice and dice algorithm starting with vertical division.',
    'Slice and dice algorithm where slicing and dicing is done based on viewport ratio.',
    'Greedy sqarify algorithm (mainimum of ratio).',
    'Greedy sqarify algorithm (average ratio).',
    'Spiral arrangement where nodes are placed in ascending order.',
    'Spiral arrangement where nodes are placed in descending order.',
    'Spiral arrangement where nodes are placed in ascending order. Time continous version.',
    'Spiral arrangement where nodes are placed in descending order. Time continous version.',
  ];
}
