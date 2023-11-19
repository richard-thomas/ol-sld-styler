# ol-sld-styler Styling Limitations

If you are using QGIS to design your map layer styling, it is important to understand that there are some limitations on layer styling exported from QGIS to what can be automatically rendered in OpenLayers by ol-sld-styler. Limitations are due to several factors:

- QGIS SLD export (either through `Package Layers` or `Save Style as SLD style file`) is not fully implemented. (QGIS sometimes puts "not implemented yet" comments in the SLD to indicate this).
- The SLD format itself cannot represent some of the styling options (see [OpenGIS SLD Specifications](https://www.ogc.org/standards/sld))
- The [SLD reader](https://www.npmjs.com/package/@nieuwlandgeo/sldreader) package at the heart of ol-sld-styler has its own limitations (see SLDreader [Restrictions on supported SLD Features](https://github.com/nieuwlandgeo/sldreader#restrictions-on-supported-sld-features))
- OpenLayers has limitations but also performs some styling operations in a different way, making SLD conversion difficult.

However, by considering what automated QGIS style conversion is supported (and some of the limitation workarounds available), a rapid flow can be achieved from making a styling update in QGIS, re-exporting a GeoPackage (or SLD file) and seeing the change with just a browser refresh of the web map.

For background information, the [GeoServer SLD Reference](https://docs.geoserver.org/stable/en/user/styling/sld/reference/index.html) is recommended as a very readable description of the SLD format. In particular, it gives a good breakdown of the raw [FeatureTypeStyle](https://docs.geoserver.org/stable/en/user/styling/sld/reference/styles.html#featuretypestyle) data structure within the SLD file that ol-sld-styler users are likely to want to modify if implementing workarounds, which it defines as:
>**FeatureTypeStyle:** "specifies the styling that is applied to a single feature type of a layer. It contains a list of rules which determine the symbology to be applied to each feature of a layer."

The support outlined below is as tested in QGIS 3.22.1 and SLDReader v0.2.12. (Not all styling options have been tested so feedback is welcome - please raise a Github issue).

## Fully supported QGIS exports

- Point Symbolizers:
  - Simple Markers (aka "well known name" in SLD): circle, triangle, square, hexagon, octagon, cross, star, diamond, cross2
  - SVG Marker (aka "graphic fill" in SLD): SVG files need to be placed in folder ./symbol/ to match the SLD exported from QGIS, so any QGIS-built-in SVG images used will need their .svg files copying from C:/OSGEO4~1/apps/qgis/svg/symbol/
  - Multi-symbol layers: yes
- Line Symbolizers:
  - Symbol layer types:
    - Simple line
    - Marker line (but only with regular shape circle)
  - Stroke styles: all (but see notes in next section)
  - Join styles: all
  - Cap styles: all
  - Custom dash pattern: yes
  - Multi-symbol layers: yes (including predefined and custom dash)
- Polygon Symbolizers:
  - Symbol layer types:
    - Simple fill: (but see notes in next section for non-"solid" stroke style)
    - SVG fill: (but see notes in next section for non-"solid" stroke style)
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
    - Offset from Point: Quadrant works, but X/Y offsets only work for positive values (QGIS Bug)
  - Placement Mode (Line):
    - Curved
  - Placement Mode (Polygon):
    - Offset from Centroid: Quadrant works, but X/Y offsets only work for positive values (QGIS Bug)
  - (other Placement modes not yet tested)
- General:
  - Symbology Type: Single Symbol, Categorized, Rule-based, (other types not tested)
  - Opacity (but only as part of colour definitions, i.e. not at layer level)
  - Scale Dependent Visibility is respected (represented in SLD as _MinScaleDenominator_ and _MaxScaleDenominator_)
  - Units of measurement mm/inches/points/pixels (though see below)

## Unsupported (or problematic) QGIS-exported SLD

- Point Symbolizers:
  - Raster Image Marker (aka "graphic fill" in SLD): QGIS-exported SLD includes just placeholder text "RasterMarker not implemented yet"
    - **WORKAROUND**: hand modify QGIS-exported SLD file to add a PNG filename and the marker size/displacement fields used in the original QGIS map. See example [Notable features (PNG marker).sld](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/sld/Notable%20features%20(PNG%20marker).sld) file used as part of the [Fully-featured example](Examples.md#fully-featured-example).
  - Ellipse/Filled/Font/Geometry Generator/Vector Field/Mask Markers: not exported to SLD
- Line Symbolizers:
  - Symbol layer types:
    - Marker line: (limited to only regular shape circle)
    - Arrow/Geometry Generator/Hashed Line/Interpolated Line: not exported to SLD
  - Pattern offset (Dash offset): values not exported to SLD
  - Stroke style: predefined (but not custom) dash patterns are incorrectly not scaled by stroke width (QGIS bug)
    - **WORKAROUND**: can be fixed in tweakFeatureTypeStyle() - see example _scaleLineSymbolizerDashArray()_ support function in [Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/full_mapconfig.js) file of [Fully-featured example](Examples.md#fully-featured-example)
- Polygon Symbolizers:
  - Symbol layer types:
    - Raster Image Fill (aka "graphic fill" in SLD): QGIS-exported SLD includes just placeholder text "RasterFill not implemented yet"
      - **WORKAROUND**: hand modify QGIS-exported SLD file to add a PNG filename and the marker size field used in the original QGIS map. See example [OS 1st edition (PNG fill).sld](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/sld/OS%201st%20edition%20(PNG%20fill).sld) file used as part of the [Fully-featured example](Examples.md#fully-featured-example).
    - Centroid Fill/Geometry Generator/Gradient Fill/Line Pattern Fill/Point Pattern Fill/Random Marker Fill/Shapeburst Fill: not exported to SLD
    - Outline types: Hashed/Interpolated Line: not exported to SLD
  - Fill style: Only "Simple Fill" styles supported
  - Stroke style: simple fill does not allow custom dash pattern or cap style to be specified. Resultant cap style is not specified so takes default "round" in OpenLayers which is different to QGIS which defaults to "square" (default is "butt" in GeoServer, so different again)
    - **WORKAROUND**: never use Stroke style other than "solid" with "simple fill" - instead add an extra symbol layer of "Outline: Simple Line" layer type and set cap style to Flat (i.e. "butt" in SLD terms). As an example see 'Water' and 'Enclosure boundary' symbols in "OS 1st edition (SVG Fill)" layer of [Fully-featured example](Examples.md#fully-featured-example).
- Text Symbolizers (i.e. labels):
  - label placement has some issues with both displacement and type (i.e. anchor location within label)
  - layer Scale dependent visibility is not carried across to label (QGIS bug)
    - **WORKAROUND**: can be manually fixed in tweakFeatureTypeStyle() - see 'Contour lines (10m) - OS Terrain 50' handling in [Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/full_mapconfig.js) file of [Fully-featured example](Examples.md#fully-featured-example)
- General:
  - always converts width values to pixels:
    - = mm * 3.78 (QGIS assumes pixel density of 96 DPI), so 1px = 0.264mm
    - = inches * 96, so 1px = 0.0104 inches
    - = points * 1.33 (72 points per inch), so 1px = 0.75 points
    - ("map units" or "metres at scale" conversion not supported - just output as pixels)
      - **WORKAROUND**: can implement map units / metres at scale with tweakOlStyle() - see 'Probable path (10m nominal width)' handling in [Map Config](https://github.com/richard-thomas/ol-sld-styler/tree/main/examples/dist/full_mapconfig.js) file of [Fully-featured example](Examples.md#fully-featured-example)
  - layer opacity cannot be encoded in SLD
    - **WORKAROUND**: set opacity as part of individual colour values

## Currently exported by QGIS but not supported by SLDreader

- Marker Line: (unsuported other than for "circle")
- Point symbolizer external graphic displacement ignored
  - **WORKAROUND**: can use tweakOlStyle() to modify displacement in OpenLayers - see setIconDisplacement() support function in example
- Parameterized SVGs are not supported: when used in QGIS there is however also a "fallback" rule exported that has no parameters. Hence for example, parameterized colouring will be lost (only colouring hard-coded within the SVG will be used). However, the colour of the fill applied as a background in QGIS will tint the black line drawing.

For details of the current specifically-supported symbolizers in SLDreader see [SLDreader: Restrictions on supported SLD Features](https://github.com/nieuwlandgeo/sldreader#restrictions-on-supported-sld-features).

## Known ol-sld-styler limitations

It is hoped to be able to address the following issues one day:

- Marker Line ("GraphicStroke with mark") line or polygon symbolizers are not click selectable: it is unclear whether this is a bug in OpenLayers itself.
  - **WORKAROUND**: if wanting to generate selectable circular markers, you can use lines with custom dash patterns with extremely short dashes and round linecap type.
- Layers without symbols (e.g. just text labels) are not greyed out if they go out of visibility scale range.
- Layers with varying symbology at different scale ranges but which are displayed in Legend/Layer Switcher as a single symbol (using the `forceSingleSymbol` option) will never be greyed out even if the zoom scale is such that none of the symbols would be in range.

Known issues for which there is no plan to address:

- Internet Explorer not supported: although Webpack can support IE9+, it would require additional polyfills and rework to overcome unsupported for..of statements.
- Layer Group visibility scale ranges not supported: even though this is possible in SLD and OpenLayers, these settings are currently not exported from QGIS.
