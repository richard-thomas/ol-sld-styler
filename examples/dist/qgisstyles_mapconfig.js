// ol-sld-styler Map Configuration: QGIS Styles demo
// All styling/data-specific settings can reside here
// - changes to this file do not require a Webpack rebuild

/* eslint no-unused-vars: 0 */

var mapConfig = {
    // Vector data layers (+ styles) imported from QGIS in OGC GeoPackage format.
    // (Generated directly in QGIS using Processing > Package Layers)
    gpkgFile: 'QGIS styling test export.gpkg',

    // Map View Projection
    displayProjection: 'EPSG:3857',

    // Initial map view [xmin, ymin, xmax, ymax]
    initialMapExtent: [-10, -40, 50, 10],

    // (Optional) DEBUG: Display (in console) template data for this file,
    // i.e. all tables in each Gpkg and their attributes
    debugShowTableJson: true,

    // (Optional) DEBUG: display (in console) raw SLD for all layer_style tables
    debugShowSLD: true,

    // Order, grouping and configuration of data layers
    dataLayersConfig: [
        {
            table: 'Polygon fill',
            popupAttr: [['notes']]
        }
    ],

    // Configuration of layer styling, for debug and for (optionally)
    // generating symbology icons for Legend and/or Layer Switcher
    sldStylerOptions: {
        // (Optional) Generate symbols for Layer Switcher
        addLayerSwitcherSymbols: true,

        // (Optional) Symbol size overrides for Layer Switcher
        lyrSwiSymbolSizing: {
            width: 25,
            height: 18,
            margin: 2
        },

        // (Optional) DEBUG: display (in console) for all SLD-styled layers the
        // "featureTypeStyle" (i.e. styling from the SLD after parsing)
        //debugShowFeatureTypeStyle: true,
    }
};
