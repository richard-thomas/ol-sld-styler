# API Specification (OpenLayers SLD Styler)

This page describes the 5 exported functions of the [ol-sld-styler](README.MD) module which should be called in the following order, though only the first two are mandatory:

- [createAllLayers()](#createalllayersdatalayersconfig)
- [styleLayers()](#stylelayersview-sourcedescription-datasources-sldlayerstyles-sldstylesoverride-options)
- [showLayerSwitcherSymbols()](#showlayerswitchersymbolsmap-layerswitcher) and/or [insertLegend()](#insertlegendmap-legendcontainerelem)
- [checkForMissingData()](#checkformissingdata)

## createAllLayers(dataLayersConfig)

Parse data layer definitions and create the required placeholder OpenLayers layers and groups.

Parameters:

- object[] `dataLayersConfig`: array of user definition objects for each data layer or group in order of display and rendering (object properties defined in table below). For each array element, the only mandatory properties are `table` (for layers) and `label` (for groups).

Returns an array of 2 objects [dataLayerList, selectableLayers]:

- ol_layer_Vector[] `dataLayerList`: ordered list of OpenLayers data layers/groups
- ol_layer_Vector[] `selectableLayers`: layers defined as click-selectable in the map (intended for supporting selected feature properties popups).

These placeholder layers will have a `title` property defined as the layer/group name prefixed by the text "(Loading...)". This `title` property is only used by the ol-LayerSwitcher if that exists. The sources and `title` properties of these placeholder layers will be updated when the required vector data has been loaded by a subsequent call to styleLayers().

`dataLayersConfig` group/layer definition properties ("example" column indicates the first example that includes this property):

Property | Type | Description | Example
-- | -- | -- | --
table | string | (mandatory for layers) data source name used as a key for _dataSources_ object passed to [styleLayers()](#stylelayersview-sourcedescription-datasources-sldlayerstyles-sldstylesoverride-options)| Basic
styleName | string | (defaults to _table_) used as a key for _sldLayerStyles_ or _sldStylesOverride_ objects passed to [styleLayers()](#stylelayersview-sourcedescription-datasources-sldlayerstyles-sldstylesoverride-options). Typically used to override SLD from GeoPackage _layer_styles_. | SLD File Load
group | object[] | (infers creation of a layer group) defines _dataLayersConfig_ object array for new group | Legend
label | string | (mandatory for groups, defaults to _table_ for layers) text for legend and Layer Switcher | Legend
visible | boolean | (default true) initial visibility of layer or group | Layer Switcher
fold | string | (groups only, default 'open') collapse layer switcher group at start-up (if set to 'close') - a standard ol-layerswitcher property | Fully-featured
collapseSymbology | boolean | (multi-symbol layers only, default false) hide layer switcher symbology at start-up | Layer Switcher
forceSingleSymbol | boolean | (layers only, default false) for multi-symbol layers display only the first defined symbol type in legend or layer switcher | Fully-featured
popupAttr | array | reserved for layer-specific configuration of feature selection "popup" windows. Such popups are not included in ol-sld-styler, but an example implementation is provided in the [Fully-featured example](Examples.md#fully-featured-example) where _popupAttr_ is used to limit which properties are displayed and if the property name is to be re-labeled. Auto-generation of popupAttr template can be done using the example's _debugShowTableJson_ property. | Fully-featured
selectable | boolean | (default true) set to false to remove layers from the _selectableLayers_ return value of [createAllLayers()](#createalllayersdatalayersconfig). Intended for use in conjunction with _popupAttr_ for feature selection popups. | Fully-featured
olLayerOptions | object | define standard OpenLayers properties that are passed to ol_layer_Vector() | Fully-featured

## styleLayers(view, sourceDescription, dataSources, sldLayerStyles, sldStylesOverride, options)

Connect newly supplied data sources to layers previously created from dataLayersConfig and style them using data source-specific SLDs, but allow for additionally supplied SLDs to override these.

Parameters:

- ol_view `view`: target OpenLayers map view
- string `sourceDescription`: (for diagnostics only) lineage of source, e.g. filename
- object `dataSources`: OpenLayers vector sources (key = table name)
- object `sldLayerStyles`: data source-specific SLDs (key = style name)
- object `sldStylesOverride`: additional higher priority SLDs (key = style name)
- object `options`: settings for styling vector layers, for debug and
  for generating symbol canvases for other controls:

Option | Type | Description
-- | -- | --
showLegend | boolean | generate symbology icons for ol-sld-styler/Legend
legendSymbolSizing | object | ol-sld-styler/Legend symbol canvas sizing in CSS pixels. Properties are:
.width | number | line/polygon drawn width (default 30)
.height | number | polygon drawn height (default 18)
.margin | number | additional margin on all sides (default 2)
addLayerSwitcherSymbols | boolean | generate symbology icons for adding to ol-layerswitcher (Layer Switcher) layers
lyrSwiSymbolSizing | object | Layer Switcher symbol canvas sizing in CSS pixels. Properties are:
.width | number | line/polygon drawn width (default 20)
.height | number | polygon drawn height (default 18)
.margin | number | additional margin on all sides (default 2)
tweakFeatureTypeStyle | function | modify "featureTypeStyle" extracted from  SLD style information by sldReader. Gets called once at setup time when SLDs are extracted. Used to overcome limitations of QGIS export and/or sldreader. (Function parameters described below.)
tweakOlStyle | function | modify generated olStyle definitions for things not possible to define in SLD or "featureTypeStyle" itself (e.g. meters at scale). Gets called for every visible feature rendered. (Function parameters described below.)
debugShowFeatureTypeStyle | boolean | write to browser console sldReader-extracted FeatureTypeStyles objects

When using QGIS "Package Layers" GeoPackage output, the layer_styles table would contain the source-specific SLDs with "style name" = "table name". Overriding SLDs (potentially sourced from individual SLD files) will automatically override source-specific SLDs if they have the same style name, or can be mapped to do so in the previously parsed dataLayersConfig. If multiple QGIS-exported GeoPackages are being used then this function can be called once for each GeoPackage to simplify using of the embedded layer_styles tables.

Workarounds for limitations of SLD styling can be implemented in supplied 'tweak' functions supplied in the `options` object. The required formats for these optional `tweakFeatureTypeStyle` and `tweakOlStyle` functions are as follows:

`tweakFeatureTypeStyle`: function(styleName, featureTypeStyle)

Modify "featureTypeStyle" extracted from SLD style information by sldReader. Gets called once for each layer at setup time when SLD is parsed. Used to overcome limitations of QGIS export and/or sldreader.

Parameters:

- `styleName`: layer styleName (defaults to table name if not defined in dataLayerConfig)
- `featureTypeStyle`: parsed SLD object - a list of styling rules which determine the symbology to be applied to each feature of a layer.

Returns featureTypeStyle: modified featureTypeStyle

`tweakOlStyle`: function(featureTypeStyle, olStyle, styleName, feature, resolution, resolutionChanged, createSymbol, symbolLabel)

Modify ol-sld-styler generated OpenLayers Styles definitions for things not possible to define in "featureTypeStyle" itself. Function is called for every visible feature rendered, so excessive complexity will impact map drawing performance.

Parameters:

- `featureTypeStyle`: symbol style definition
- `olStyle`: OpenLayers Style array
- `styleName`: styleName (or if not defined: table) from dataLayersConfig
- `feature`: current Openlayers Feature (or example feature if createSymbol true)
- `resolution`: (real) resolution in metres/pixel
- `resolutionChanged`: has resolution changed for any styles used by current feature
- `createSymbol`: call is only to create a symbol for Layer Switcher / Legend
- `symbolLabel`: symbol label (only defined when createSymbol true)

Returns ol_Styles_Style: modified OpenLayers styles array

## showLayerSwitcherSymbols(map, LayerSwitcher)

Add symbology icons to an already created [ol-layerswitcher](https://www.npmjs.com/package/ol-layerswitcher) Layer Switcher.

Parameters:

- object `map`: target OpenLayers map
- ObjectConstructor `LayerSwitcher`: ol-layerswitcher constructor

Prior to calling this function, the `addLayerSwitcherSymbols` option must have been enabled (plus resizing if required) in a call to styleLayers(). Additional formatting of the Layer Switcher symbology is defined in the `dataLayersConfig` - more details in [createAllLayers()](#createalllayersdatalayersconfig) section above.

## insertLegend(map, legendContainerElem)

Generate map legend for all layers/groups defined in the previously parsed `dataLayersConfig` data layers definition.

Parameters:

- object `map`: target OpenLayers map
- HTMLElement `legendContainerElem`: container for legend

The `legendContainerElem` HTML container (typically a 'div' element) must already exist and the `showLegend` option must have been enabled (plus resizing if required) through an earlier call to styleLayers(). Additional formatting of the Legend symbology is defined in the `dataLayersConfig` - more details in [createAllLayers()](#createalllayersdatalayersconfig) section above. Note that this function only generates the raw Legend content - the [Legend Example](Examples.md#legend-example) wraps this up in a styled box widget with an associated show/hide toggle button.

## checkForMissingData()

Detect if any tables defined in `dataLayersConfig` are still missing, replacing any remaining Layer Switcher "(Loading...)" placeholders with "(No Data)" to highlight any data loading or layer mis-configuration problems.

Returns boolean: true if data tables missing
