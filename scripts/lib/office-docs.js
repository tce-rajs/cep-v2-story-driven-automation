// Small but valid Word / PowerPoint / OpenDocument files, built from their XML parts (see mini-zip.js).
// Excel formats are written with the `xlsx` package instead (it also writes the legacy .xls format).

const { makeZip } = require('./mini-zip');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function docx(paragraphs) {
  const body = paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${esc(p)}</w:t></w:r></w:p>`).join('');
  return makeZip([
    {
      name: '[Content_Types].xml',
      data:
        XML +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      data:
        XML +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'word/document.xml',
      data:
        XML +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        `<w:body>${body}<w:sectPr/></w:body></w:document>`,
    },
  ]);
}

function pptx(slides) {
  const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
  const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const rels = (items) =>
    XML +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`).join('') +
    '</Relationships>';
  const emptyTree =
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>';
  const textBox = (id, y, text, size) =>
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="457200" y="${y}"/><a:ext cx="8229600" cy="1200000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="${size}"/><a:t>${esc(text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
  const theme =
    XML +
    `<a:theme xmlns:a="${A}" name="Test"><a:themeElements>` +
    '<a:clrScheme name="Test"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>' +
    '<a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1>' +
    '<a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4>' +
    '<a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink>' +
    '<a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme>' +
    '<a:fontScheme name="Test"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
    '<a:fmtScheme name="Test"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
    '<a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="38100"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>' +
    '</a:themeElements></a:theme>';

  const entries = [
    {
      name: '[Content_Types].xml',
      data:
        XML +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
        '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
        '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
        '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
        slides
          .map(
            (_, i) =>
              `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
          )
          .join('') +
        '</Types>',
    },
    { name: '_rels/.rels', data: rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]) },
    {
      name: 'ppt/presentation.xml',
      data:
        XML +
        `<p:presentation xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}">` +
        '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
        `<p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('')}</p:sldIdLst>` +
        '<p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>',
    },
    {
      name: 'ppt/_rels/presentation.xml.rels',
      data: rels([
        ['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'],
        ...slides.map((_, i) => [`rId${i + 2}`, 'slide', `slides/slide${i + 1}.xml`]),
        [`rId${slides.length + 2}`, 'theme', 'theme/theme1.xml'],
      ]),
    },
    {
      name: 'ppt/slideMasters/slideMaster1.xml',
      data:
        XML +
        `<p:sldMaster xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}">${emptyTree}</p:spTree></p:cSld>` +
        '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
        '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>',
    },
    {
      name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      data: rels([
        ['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'],
        ['rId2', 'theme', '../theme/theme1.xml'],
      ]),
    },
    {
      name: 'ppt/slideLayouts/slideLayout1.xml',
      data:
        XML +
        `<p:sldLayout xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}" type="blank">${emptyTree}</p:spTree></p:cSld>` +
        '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>',
    },
    {
      name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      data: rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]),
    },
    { name: 'ppt/theme/theme1.xml', data: theme },
  ];
  slides.forEach(([title, body], i) => {
    entries.push({
      name: `ppt/slides/slide${i + 1}.xml`,
      data:
        XML +
        `<p:sld xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}">${emptyTree}` +
        textBox(2, 457200, title, 4000) +
        textBox(3, 2000000, body, 2400) +
        '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>',
    });
    entries.push({
      name: `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      data: rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']]),
    });
  });
  return makeZip(entries);
}

function openDocument(kind, bodyXml) {
  const mime = {
    text: 'application/vnd.oasis.opendocument.text',
    presentation: 'application/vnd.oasis.opendocument.presentation',
  }[kind];
  const ns =
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
    'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" ' +
    'xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"';
  return makeZip([
    { name: 'mimetype', data: mime },
    {
      name: 'META-INF/manifest.xml',
      data:
        XML +
        '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
        `<manifest:file-entry manifest:full-path="/" manifest:media-type="${mime}"/>` +
        '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>',
    },
    {
      name: 'content.xml',
      data:
        XML +
        `<office:document-content ${ns} office:version="1.2"><office:body>${bodyXml}</office:body></office:document-content>`,
    },
  ]);
}

const odt = (paragraphs) =>
  openDocument('text', `<office:text>${paragraphs.map((p) => `<text:p>${esc(p)}</text:p>`).join('')}</office:text>`);

const odp = (slides) =>
  openDocument(
    'presentation',
    '<office:presentation>' +
      slides
        .map(
          ([title, body], i) =>
            `<draw:page draw:name="Slide${i + 1}"><draw:frame svg:x="2cm" svg:y="2cm" svg:width="20cm" svg:height="3cm">` +
            `<draw:text-box><text:p>${esc(title)}</text:p><text:p>${esc(body)}</text:p></draw:text-box></draw:frame></draw:page>`
        )
        .join('') +
      '</office:presentation>'
  );

module.exports = { docx, pptx, odt, odp };
