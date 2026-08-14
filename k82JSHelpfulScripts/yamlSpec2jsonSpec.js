const fs = require('fs');

let indent = 0;

let endings = [];

let arr;

let r = [
  'Pod.yaml'
]

let rOut = [];

for (let res of r) {
  let str = fs.readFileSync(`./res/${res}`).toString().trim();
  let yaml = str.split('\n').slice(str.split('\n').indexOf('FIELDS:') + 1, str.split('\n').length);
  yaml.push('');

  let out = `const ${res.split('.')[0]} = Schema({\n`;

  let types = (line) => {
    if (line.split('	')[1]?.includes('[]')) {
      if (line.split('	')[1]?.includes('Quantity')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: [ String ],\n`
      } else if (line.split('	')[1]?.includes('string') || line.split('	')[1]?.includes('IntOrString')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: [ String ],\n`
      } else if (line.split('	')[1]?.includes('integer') || line.split('	')[1]?.includes('number')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: [ Number ],\n`
      } else if (line.split('	')[1]?.includes('FieldsV1')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: [ String ],\n`
      } else if (line.split('	')[1]?.includes('boolean')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: [ Boolean ],\n`
      } else if (line.split('	')[1]?.includes('JSON')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: [ Object ],\n`
      } else {
        console.log(res);
        console.log(line);
        console.log(`Cound not find: ${line.split('	')[1]?.trim()}`);
      }
    } else {
      if (line.split('	')[1]?.includes('map[string]')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: {\n${new Array(indent + 2).fill(' ').join('')}type: Map,\n${new Array(indent + 2).fill(' ').join('')}of: String,\n${new Array(indent).fill(' ').join('')}},\n`
      } else if (line.split('	')[1]?.includes('Quantity')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: String,\n`
      } else if (line.split('	')[1]?.includes('string') || line.split('	')[1]?.includes('IntOrString')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: String,\n`
      } else if (line.split('	')[1]?.includes('integer') || line.split('	')[1]?.includes('number')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: Number,\n`
      } else if (line.split('	')[1]?.includes('FieldsV1')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: String,\n`
      } else if (line.split('	')[1]?.includes('boolean')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: Boolean,\n`
      } else if (line.split('	')[1]?.includes('JSON')) {
        out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: Object,\n`
      } else {
        console.log(res);
        console.log(line);
        console.log(`Cound not find: ${line.split('	')[1]?.trim()}`);
      }
    }
  }

  yaml.forEach((line, i) => {
    if (i < yaml.length - 1) {
      let currLine = line.split('\t')[0];
      let nextLine = yaml[i + 1].split('\t')[0];
      let val;
      if ((nextLine?.match(new RegExp(" ", "g"))?.length && currLine?.match(new RegExp(" ", "g"))?.length || line.trim() !== '') || Number.isNaN(currLine.match(new RegExp(" ", "g"))?.length)) {
        indent = currLine?.match(new RegExp(" ", "g"))?.length
        if (Number.isNaN(indent)) {
          indent = 0;
        }
        if ((nextLine.match(new RegExp(" ", "g"))?.length || 0) > (currLine.match(new RegExp(" ", "g"))?.length || 0)) {
          if (line.split('	')[1]?.includes('[]')) {
            out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: [{\n`
            endings.push('}],\n')
          } else {
            out += `${new Array(indent).fill(' ').join('')}${line.split('\t')[0].trim()}: {\n`
            endings.push('},\n')
          }
        } else if ((nextLine.match(new RegExp(" ", "g"))?.length || 0) === (currLine.match(new RegExp(" ", "g"))?.length || 0)) {
          types(line);
        } else if (currLine?.match(new RegExp(" ", "g"))?.length) {
          types(line);
          do {
            out += `${new Array(indent).fill(' ').join('')}${endings.pop()}`
            indent -= 2
          } while (indent > (nextLine?.match(new RegExp(" ", "g"))?.length || 0));
        }
      }
    }
  });

  out += '});';
  rOut.push(out)
  fs.writeFileSync(`./json/${res.split('.')[0]}.js`, out);
}

fs.writeFileSync(`./json/all.js`, rOut.join('\n\n'));



// let yaml = fs.readFileSync('node.yaml').toString();
//
