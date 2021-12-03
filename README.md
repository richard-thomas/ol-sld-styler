# OpenLayers SLD Styler

[![npm](https://img.shields.io/npm/v/ol-sld-styler)](https://www.npmjs.com/package/ol-sld-styler)

A JavaScript module to style OpenLayers vector layers using SLD data and optionally generate a map legend and/or embed symbols in a layer selector.
It is primarily designed to help build a web map with data/styles directly exported from QGIS as OGC GeoPackage(s) using the [Package Layers](https://docs.qgis.org/3.16/en/docs/user_manual/processing_algs/qgis/database.html#package-layers) Processing Toolbox operation and to quickly rebuild the map with subsequent updated QGIS exports. However, as the module inputs are collections of OpenLayers "vector sources", SLDs and a "layer configuration" object it can also be used for general SLD styling from other data/style sources. It includes user-defined function hooks for modifying SLD-imported styling where desired styling was not possible due to QGIS export or SLD limitations.

It is implemented as an NPM module which adds symbology generation, "layer configuration" parsing and user-defined symbology enhancement to the following third party NPM modules:

- [@NieuwlandGeo/sldreader](https://www.npmjs.com/package/@nieuwlandgeo/sldreader): conversion of SLD to OpenLayers style function
- [ol-layerswitcher](https://www.npmjs.com/package/ol-layerswitcher): a layer list control for an OpenLayers map

To extract vector data and SLD layer styles from QGIS "Package Layers" output, it is intended to be used in conjunction with its sister NPM module:

- [ol-load-geopackage](https://www.npmjs.com/package/ol-load-geopackage): OpenLayers OGC GeoPackage Loader

By using an OGC GeoPackage as its primary data/styling source, it enables creation of an _offline_ map viewer for mobile phones or tablets which have poor (or non-existent) network connectivity. When a network connection is available, data and stying updates could then be done by downloading just 1 file.

## Examples

_(Brief summary - see separate [Examples](Examples.md) page for full details of specific functionality incorporated in each example.)_

Each example is presented as the directly viewable web page (generated by the Webpack module bundler) followed by the HTML/JavaScript source code + a "Map Configuration" JSONP file and a brief summary:

- **Basic example**:
[web page](https://richard-thomas.github.io/ol-sld-styler/examples/dist/basic_example.html) (sources:
[HTML](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/basic_example.html),
[JavaScript](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/src/basic_example.js),
[Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/basic_mapconfig.js))
  - Loads vector tables and associated QGIS "layer_styles" SLD XML strings from an OGC GeoPackage and render all tables as styled layers on an OpenLayers map. Displays details of package contents.
- **SLD File Load example**:
[web page](https://richard-thomas.github.io/ol-sld-styler/examples/dist/sld_files_example.html) (sources:
[HTML](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/sld_files_example.html),
[JavaScript](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/src/sld_files_example.js),
[Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/sld_files_mapconfig.js))
  - Additionally include styling data read from separate SLD file(s).
- **Legend example**:
[web page](https://richard-thomas.github.io/ol-sld-styler/examples/dist/legend_example.html) (sources:
[HTML](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/legend_example.html),
[JavaScript](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/src/legend_example.js),
[Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/legend_mapconfig.js))
  - Generate a map legend (with show/hide toggle).
- **Layer Switcher example**:
[web page](https://richard-thomas.github.io/ol-sld-styler/examples/dist/layersw_example.html) (sources:
[HTML](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/layersw_example.html),
[JavaScript](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/src/layersw_example.js),
[Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/layersw_mapconfig.js))
  - Embed symbology in a layer selector created by third party ol-layerswitcher NPM module.
- **Full Layer Switcher, Legend + Extras example**:
[web page](https://richard-thomas.github.io/ol-sld-styler/examples/dist/full_example.html) (sources:
[HTML](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/full_example.html),
[JavaScript](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/src/full_example.js),
[Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/full_mapconfig.js))
  - Style OpenLayers vector layers, embed symbology in a layer selector, create a map legend, plus many extras required for a typical web map incorporating multiple data and SLD styling sources.

## Installation

Use Node.js to install the NPM package: [ol-sld-styler](https://www.npmjs.com/package/ol-sld-styler)

```bash
npm install --save ol-sld-styler
```

Note: Internet Explorer is not supported.

## Basic usage

This package must be imported as a module - it is not designed to be loaded directly with a \<script\> tag. The [examples](#examples) (above) best demonstrate usage with the [API](#api) section (below) defining the exact function parameters and return values. However, the following pseudocode segment outlines the basic methodology:

```javascript
import 'ol/ol.css';
import 'ol-sld-styler/dist/ol-sld-styler.css';
import {createAllLayers, styleLayers, checkForMissingData,
    insertLegend, showLayerSwitcherSymbols} from 'ol-sld-styler';

var dataLayerList;    // Ordered list of OpenLayers data layers/groups
var selectableLayers; // Layers marked selectable in dataLayersConfig

// Parse data layer definitions and create placeholder layers
// - dataLayersConfig {object}: ol-sld-styler layer-specific configuration
[dataLayerList, selectableLayers] = createAllLayers(dataLayersConfig);

// (Load and extract all layer data and styles -
//    e.g. use ol-load-geopackage module)

// (Create OpenLayers map using dataLayerList)

// Assign data sources to layers and do all OpenLayers layer styling
// Parameters:
// - view: target OpenLayers map view
// - sourceDescription {string}: sources lineage (for diagnostics only)
// - dataSources {object}: OpenLayers vector sources (key = table name)
// - sldLayerStyles {object}: data source-specific SLDs (key = table name)
// - sldStylesOverride {object}: shared SLDs (key = table name)
// - sldStylerOptions {object}: ol-sld-styler general configuration
styleLayers(view, sourceDescription, dataSources, sldLayerStyles,
    sldStylesOverride, sldStylerOptions);

// Apply optional extra ol-sld-styler functions
showLayerSwitcherSymbols(...)
insertLegend(...)
checkForMissingData(...)
```

## Webpack bundling

The (shared) support files used to bundle the examples using Webpack 5 ([package.json](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/package.json), [webpack.config.js](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/webpack.config.js)) are in the examples folder. If you clone the repository then you can (re-)build the code bundles (for both examples) with the following commands. Note that the "sql-install" script is to fulfill the requirements from the [ol-load-geopackage](https://www.npmjs.com/package/ol-load-geopackage) module which is incorporated in all the examples. It simply copies the sql.js web assembly file (sql-wasm.wasm) from folder _node_modules/sql.js/dist/_ to the folder where the web page is to be loaded from.

```bash
cd examples
npm install
npm run-script sql-install
npm run-script build
```

The Webpack dev-server can be used to automatically re-build, act as a webhost and trigger the browser to reload every time the code changes. One of the following script commands (defined in [package.json](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/package.json)) can be used to start the dev-server for each of the examples:

```bash
npm run-script start-basic
npm run-script start-sldfiles
npm run-script start-layersw
npm run-script start-legend
npm run-script start-full
```

## API

The JavaScript module has 5 exported functions which are described in the separate [API Specification](API.md):

- [createAllLayers()](API.md#createalllayersdatalayersconfig): Parse data layer definitions and create placeholder OpenLayers layers/groups
- [styleLayers()](API.md#stylelayersview-sourcedescription-datasources-sldlayerstyles-sldstylesoverride-options): Connect data sources to placeholder layers and style them with SLD data
- [showLayerSwitcherSymbols()](API.md#showlayerswitchersymbolsmap-layerswitcher): Add symbology icons to an ol-layerswitcher Layer Switcher.
- [insertLegend()](API.md#insertlegendmap-legendcontainerelem): Generate map legend for all layers/groups defined in data layers definition.
- [checkForMissingData()](API.md#checkformissingdata): Detect (and mark in Layer Switcher) any layers with missing data tables

## Usage Recommendations

Use QGIS as a primary source for layer styling and OGC GeoPackage generation:

- You can view in QGIS the project file that can be used to re-generate the GeoPackages for all the ol-sld-styler [Examples](Examples.md) (file [ol-sld-styler example.qgz](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/ol-sld-styler%20example.qgz)). Note that this is a version of the original file that has had its data sources redirected to the GeoPackages that were output by the original.
- Before choosing your own QGIS layer styling, consider ol-sld-styler [styling limitations](#styling-limitations).
- Within QGIS, use `Processing Toolbox > Package Layers` and select `Save layer styles into package` to generate an OGC GeoPackage which includes a table _layer_styles_ which contains the SLD information.
- Be aware that if you have layers that use the same source data tables, then `Package Layers` will repeatedly write out all the data for each of these layers.
- Hence for simplicity and minimum GeoPackage size, try to combine layers using the same source data table using QGIS "Categorized" symbology. ol-sld-styler will display all the separate symbols and labels in a legend and/or layer switcher for such multi-symbol layers. However, bear in mind that ol-layerswitcher/OpenLayers can only switch visibility on/off for a whole layer.
- Where multiple layers do end up using the same source data table, you can minimize the GeoPackage size by only including one of these layers in the GeoPackage but saving the SLD for the other layers as ".sld" files using QGIS `Layer Properties > Symbology > Style > Save Style... > As SLD Style File`. Such ".sld" files can then be passed to ol-sld-styler to generate additional layers from the same data source table (see [SLD File Load example](Examples.md#sld-file-load-example) for just such an example).

When using ol-sld-styler:

- Even if you are not using QGIS to export the data and styles, consider using OGC GeoPackages as a source format: they are a very efficient way to store and retrieve spatial data and have been supported by all major GIS applications for many years.
- If you are using GeoPackages and do not require sophisticated handling operations, consider using [ol-load-geopackage](https://www.npmjs.com/package/ol-load-geopackage) (as used in all the examples).
- To ease creation of the required `dataLayersConfig` array, you can generate a template of all the tables in your GeoPackage using the debugShowTableJson() function provided in the examples - the [Fully-featured example](Examples.md#fully-featured-example) version of this includes generation of the _popupAttr_ properties (extracting all attributes for each layer).
- If you want to modify the styles extracted from SLD, use [styleLayers()](API.md#stylelayersview-sourcedescription-datasources-sldlayerstyles-sldstylesoverride-options) option `tweakFeatureTypeStyle()` in preference to `tweakOlStyle()` to improve performance. To help in using the former, the _debugShowFeatureTypeStyle_ option of styleLayers() will export to the browser console the `featureTypeStyle` extracted from each layer.
- Consider using the [WebPack bundler](#webpack-bundling) (other bundlers like Parcel should work but have not been tested).
- The examples all use a separate file ("\*\_mapconfig.js") which does not get included in the bundler but is loaded separately in the HTML file with its own \<script\> tag. Although less optimized, this approach allows the styling to be quickly modified without any Webpack rebuilding (just a browser refresh). In the examples this file includes definitions for `dataLayersConfig`, styleLayers() options (listed as `sldStylerOptions` which includes the tweakFeatureTypeStyle() and tweakOlStyle() functions) and any other constants that are helpful to be able to tweak (like source file names and map extent).

Creating an offline map viewer:

- By using an OGC GeoPackage as a primary data/styling source, you can create an _offline_ map viewer for mobile phones or tablets which have poor (or non-existent) network connectivity. When a network connection is available, data and stying updates could then be done by downloading just 1 file.
- Offline usage will require hosting an ol-sld-styler web site on a simple web server running locally on the device (simply opening the files in a browser will not work).
- On Android, one minimal web server option is to install [Tiny Web Server](https://play.google.com/store/apps/details?id=ar.com.lrusso.tinywebserver) which seems to work well even though it is old and no longer maintained. However, note that this (and many others) lack correct mime-type support for SVG files. If you were intending to use SVG, then a workaround is to instead use raster files as demonstrated in the [Fully-featured example](Examples.md#fully-featured-example). Various websites can be used for online SVG to PNG conversion (including transparency) including:
  - https://cloudconvert.com/svg-to-png
  - https://image.online-convert.com/convert/svg-to-png

## Styling Limitations

_(Brief summary - see separate [Styling Limitations](StylingLimitations.md) page for full details, including some suggested workarounds.)_

If you are using QGIS to design your map layer styling, it is important to understand that there are some limitations on layer styling exported from QGIS to what can be automatically rendered in OpenLayers by ol-sld-styler. Limitations are due to several factors:

- QGIS SLD export (either through `Package Layers` or `Save Style as SLD style file`) is not fully implemented. (QGIS sometimes puts "not implemented yet" comments in the SLD to indicate this).
- The SLD format itself cannot represent some of the styling options.
- The [SLD reader](https://www.npmjs.com/package/@nieuwlandgeo/sldreader) package at the heart of ol-sld-styler has its own limitations.
- OpenLayers has limitations but also performs some styling operations in a different way, making SLD conversion difficult.
- Unintended shortcomings of ol-sld-styler (please raise a Github issue!)

However, by considering what automated QGIS style conversion is supported (and some of the limitation workarounds available), a rapid flow can be achieved from making a styling update in QGIS, re-exporting a GeoPackage (or SLD file) and seeing the results immediately with just a browser refresh of the web map.

## Contributions

For bug reports, enhancement requests or code contributions please see [CONTRIBUTING](CONTRIBUTING.md).

## Licence

Original code in this module is provided under the ISC licence - see [LICENCE](LICENCE.md).

Thanks to Jean-Marc Viglino (@viglino): code for the internal createSymbol() function was based on the Legend.getLegendImage() function of the [ol-ext Legend Control](https://viglino.github.io/ol-ext/doc/doc-pages/ol.control.Legend.html) which is used under the French Opensource BSD compatible CeCILL-B FREE SOFTWARE LICENSE. (c) 2016-2019 - Jean-Marc Viglino. Full licence details: [English](https://cecill.info/licences/Licence_CeCILL-B_V1-en.txt), [French](https://cecill.info/licences/Licence_CeCILL-B_V1-fr.txt)

## Acknowledgements

Thanks also to Arjen Kopinga (@ajkopinga) at Nieuwland Geo-Informatie for providing rapid fixes and updates to the occasional issues I raised with the [@NieuwlandGeo/sldreader](https://www.npmjs.com/package/@nieuwlandgeo/sldreader) module that is at the heart of this module.

Matt Walker's (@walkermatt) [ol-layerswitcher](https://www.npmjs.com/package/ol-layerswitcher) layer list control has proved an invaluable basis into which this module could inject layer (multi-)symbology.

ol-sld-styler was inspired by the [qgis2web](https://github.com/tomchadwin/qgis2web) QGIS plugin.
