export interface Info {
  id: number;
  type: string;
  values: string[];
}

export interface InfoTemplate {
  id: number;
  type: string;
  names: string[];
}

export interface Content {
  id: number;
  infos: Info[];
}

export interface ContentTemplate {
  id: number;
  infoTemplates: InfoTemplate[];
}

export interface Section {
  id: number;
  name: string;
  contentTemplate: ContentTemplate;
  contents: Content[];
}

export interface Resume {
  id: number;
  title: string;
  sections: Section[];
}
