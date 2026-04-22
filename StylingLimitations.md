# ol-sld-styler Styling Limitations

_(Information on this page is based on testing with QGIS 3.44.9, SLDReader v1.0.0 and OpenLayers 10.8. Not all styling options have been tested so feedback is welcome - please raise a Github issue)._

If you are using QGIS to design your map layer styling, it is important to understand that there are some limitations on layer styling exported from QGIS to what can be automatically rendered in OpenLayers by ol-sld-styler. Limitations are due to several factors:

- QGIS SLD export (either through `Package Layers` or `Save Style as SLD style file`) is not fully implemented.
- The SLD format itself cannot represent some of the styling options (see [OpenGIS SLD Specifications](https://www.ogc.org/standards/sld))
- The [SLD reader](https://www.npmjs.com/package/@nieuwlandgeo/sldreader) package at the heart of ol-sld-styler has its own limitations (see SLDreader [Requirements & SLD feature support](https://github.com/nieuwlandgeo/sldreader#requirements))
- OpenLayers has limitations but also performs some styling operations in a different way, making SLD conversion difficult.

However, by considering what automated QGIS style conversion is supported (and some of the limitation workarounds available), a rapid flow can be achieved from making a styling update in QGIS, re-exporting a GeoPackage (or SLD file) and seeing the change with just a browser refresh of the web map.

If using QGIS-exported SLD, it is recommended to enable `qgisCompatibility` in `sldStylerOptions` (as passed to styleLayers()). This will turn on both any ol-sld-styler fixes (like SVG system path redirection) and underlying [sldreader QGIS fixes](https://github.com/nieuwlandgeo/sldreader#compatibility-mode-qgis) (such as symbol displacement Y inversion).

For background information, the [GeoServer SLD Reference](https://docs.geoserver.org/latest/en/user/styling/sld/reference/) is recommended as a very readable description of the SLD format. In particular, it gives a good breakdown of the raw [Rules](https://docs.geoserver.org/latest/en/user/styling/sld/reference/rules/) data structure within the SLD FeatureTypeStyle that ol-sld-styler users are likely to want to modify if implementing workarounds.

## Fully supported QGIS exports

- Point Symbolizers:
  - Simple Markers (aka "well known name" in SLD): all QGIS shapes (circle, triangle, etc) - as illustrated in the [SLDReader pointSymbolizer library](https://nieuwlandgeo.github.io/SLDReader/mark-gallery.html)
  - SVG Markers (aka "ExternalGraphic" in SLD): "embedded file" SVG files work. Otherwise file references always generate problematic absolute local file paths in the SLD, though this can be fixed by enabling qgisCompatibility (see next section).
  - Font Markers
  - Multi-symbol layers: yes
- Line Symbolizers:
  - Symbol layer types:
    - Simple line
    - Marker line (with all QGIS marker shapes and Font Markers)
  - Stroke styles: all (but see notes in next section)
  - Join styles: all
  - Cap styles: all
  - Custom dash pattern: yes
  - Multi-symbol layers: yes (including predefined and custom dash)
- Polygon Symbolizers:
  - Symbol layer types:
    - Simple fill: (but see notes in next section for non-"solid" stroke style)
    - SVG fill: (but see notes in next section for non-"solid" stroke style)
    - Centroid Fill: simply replaces Polygon Symbolizer with Point Symbolizer (so results similar though not exactly the same).
    - Outline: Marker Line
    - Outline: Simple Line (including custom dash pattern)
  - Fill style: All "Simple Fill" styles supported:
    - solid
    - hatching: Horizontal, Vertical, Cross, BDiagonal, FDiagonal, Diagonal X
    - dot density brush patterns: Dense 1 ... Dense 7
  - Multi-symbol layers: yes (including predefined and custom dash Stroke styles)
- Text Symbolizers (i.e. labels):
  - Text: font setting and sizing
  - Buffer
  - Placement Mode (Point):
    - Offset from Point: Quadrant and X/Y offsets now both work
  - Placement Mode (Line):
    - Curved
  - Placement Mode (Polygon):
    - Offset from Centroid: Quadrant and X/Y offsets now both work
  - (other Placement modes not yet tested)
- General:
  - Symbology Type: Single Symbol, Categorized, Rule-based, (other types not tested)
  - Opacity (but only as part of colour definitions, i.e. not in "layer rendering" or "single symbol" settings)
  - Scale Dependent Visibility is respected (represented in SLD as _MinScaleDenominator_ and _MaxScaleDenominator_).
  - Units of measurement "map units" or "metres at scale": supported but must be specified in "Units" at top level of QGIS layer "symbology" definition.
  - Units of measurement mm/inches/points/pixels: these will always be converted to (integer truncated) pixel values in the SLD using the OGC "standardized rendering pixel size" of 0.28mm, hence size in pixels:
    - = mm / 0.28 (1 mm = 3.57 px)
    - = inches / 0.011 (1 inch = 90.7 px)
    - = points / 0.7937 (1 pt = 1.26 px)

## Unsupported (or problematic) QGIS-exported SLD

When exporting SLD through `Package Layers` or `Save Style as SLD style file`, QGIS sometimes puts "not implemented yet" comments in the SLD to indicate this. Newer versions of QGIS tend to refuse to write any SLD for a problematic layer and show a pop-up warning dialog (with `Save Style`) but just silently writing nothing with `Package Layers`. Hence if you find an empty _styleSLD_ field in the layer_styles table of an exported GeoPackage try running `Save Style as SLD style file` for just that layer to find the failure reason.

- Point Symbolizers:
  - SVG Marker: if not using "embedded file", QGIS will export SLD with an absolute path on the local disk for system/user/project SVGs which cannot work for a web application.
    - **WORKAROUND**: if `qgisCompatibility` mode is enabled, and you ensure paths include '/svg/' these will be redirected to `svgRedirectFolder` which a user can set to a suitable URL (e.g. a local web folder with copies of the required SVGs). It defaults (with a warning) to QGIS SVG source on Github which should work for system SVGs. See [styleLayers()](API.md#stylelayersview-sourcedescription-datasources-sldlayerstyles-sldstylesoverride-options) API specification for details.
  - Raster Image Marker (aka "graphic fill" in SLD): QGIS-exported SLD uses a full local disk path and does not include size & displacement parameters
    - **WORKAROUND**: hand modify QGIS-exported SLD file to adjust PNG filename (or use an embedded PNG). Then add the marker size/displacement fields used in the original QGIS map. See example [Notable features (PNG marker).sld](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/sld/Notable%20features%20(PNG%20marker).sld) file used as part of the [Fully-featured example](Examples.md#fully-featured-example). (The original QGIS SLD export is in folder "QGIS style export originals").
  - Ellipse Marker: exported to SLD, but uses custom VendorOption 'widthHeightFactor' to specify the stretch of a "well known name" marker. These will be rendered without any such stretch.
  - Filled/Geometry Generator/Vector Field/Mask Markers: not exported to SLD
- Line Symbolizers:
  - Symbol layer types:
    - Hashed Line: values not exported to SLD
      - **WORKAROUND**: the same effect can be implemented using a simple thick line with a very short custom dash pattern (say 1px dash, 6px space) and 'Flat' cap style. This is the basic technique used in the "Hachure" example on layer "OS 1st edition SVG fill" of the [Fully-featured example](Examples.md#fully-featured-example), although for that layer in order to additionally make the width in "Map Units" a fix had to be added in a tweakOlStyle() function in its [Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/full_mapconfig.js) JavaScript code.
    - Arrow/Filled Line/Geometry Generator/Interpolated Line: not exported to SLD
  - Pattern offset (Dash offset): values not exported to SLD
  - Stroke style: predefined (but not custom) dash patterns are incorrectly not scaled by stroke width (QGIS bug)
    - **WORKAROUND**: can be fixed in tweakFeatureTypeStyle() - see example _scaleLineSymbolizerDashArray()_ support function in [Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/full_mapconfig.js) file of [Fully-featured example](Examples.md#fully-featured-example)
- Polygon Symbolizers:
  - Symbol layer types:
    - Raster Image Fill (aka "graphic fill" in SLD): QGIS-exported SLD includes just placeholder text "RasterFill not implemented yet"
      - **WORKAROUND**: hand modify QGIS-exported SLD file to add a PNG filename and the marker size field used in the original QGIS map. See example [OS 1st edition (PNG fill).sld](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/sld/OS%201st%20edition%20(PNG%20fill).sld) file used as part of the [Fully-featured example](Examples.md#fully-featured-example).
    - Line Pattern Fill/Point Pattern Fill: not exported by default
      - **WORKAROUND**: individual layers can be exported with 'Save Layer Style' if 'SLD Options: Export polygon as PNG tiles' is selected. This will set the path of the resultant PNG(s) as the same folder, so the SLD file will need to be edited to set the required path for the PNGs.
    - Geometry Generator/Gradient/Random Marker/Shapeburst Fills: never exported to SLD
    - Outline types: Hashed/Interpolated Line: not exported to SLD
  - Fill style: Only "Simple Fill" styles supported
  - Stroke style: simple fill does not allow custom dash pattern or cap style to be specified. Resultant cap style is not specified so takes default "round" in OpenLayers which is different to QGIS which defaults to "square" (default is "butt" in GeoServer, so different again)
    - **WORKAROUND**: never use Stroke style other than "solid" with "simple fill" - instead add an extra symbol layer of "Outline: Simple Line" layer type and set cap style to Flat (i.e. "butt" in SLD terms). As an example see 'Water' and 'Enclosure boundary' symbols in "OS 1st edition (SVG Fill)" layer of [Fully-featured example](Examples.md#fully-featured-example).
- Text Symbolizers (i.e. labels):
  - labels with no symbols cannot be exported to SLD
    - **WORKAROUND**: turn on single symbol marker, but set it to 0% opacity fill & stroke. If using rules with an ELSE on the label, need to set an ELSE on symbology that is a superset of features that would be caught by label ELSE filter - ideally make the symbology a single rule ELSE. As an example see 'OS Open Zoomstack - names' layer of [Fully-featured example](Examples.md#fully-featured-example).
  - label placement has some issues with both displacement and type (i.e. anchor location within label)
  - layer Scale dependent visibility is not carried across to label, but if set within label properties works fine.

- General:
  - Opacity in "layer rendering" or "single symbol" settings is not exported to SLD (except for single symbol settings in Polygon Symbolizers) ([QGIS Issue #65897](https://github.com/qgis/QGIS/issues/65897))
    - **WORKAROUND**: set opacity as part of individual colour values for fill and stroke.
  - Layer Group visibility scale ranges not exported: only layers not groups can have SLD exported. (If this becomes possible, both SLD and OpenLayers would support this).

## Exported by QGIS but not fully supported by SLDreader

- Ellipse Marker: QGIS puts in the SLD a custom VendorOption 'widthHeightFactor' to specify the stretch of a "well known name" marker. (This stretch is currently ignored).
- Parametric SVG support is only experimental, so may not work for complex examples.

For details of the current specifically-supported symbolizers in SLDreader see [SLDreader: Restrictions on supported SLD Features](https://github.com/nieuwlandgeo/sldreader#restrictions-on-supported-sld-features).

## Known ol-sld-styler limitations

It is hoped to be able to address the following issues one day:

- Layers without symbols (e.g. just text labels) are not greyed out if they go out of visibility scale range. (However as noted earlier, in QGIS all layers must include symbols even if they are made transparent to hide them).
- Layers with varying symbology at different scale ranges but which are displayed in Legend/Layer Switcher as a single symbol (using the `forceSingleSymbol` option) will never be greyed out even if the zoom scale is such that none of the symbols would be in range.

Known issues for which there is no plan to address:

- Internet Explorer not supported: although Webpack can support IE9+, it would require additional polyfills and rework to overcome unsupported for..of statements.
