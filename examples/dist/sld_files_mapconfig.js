// ol-sld-styler Map Configuration: SLD file load demo
// All styling/data-specific settings can reside here
// - changes to this file do not require a Webpack rebuild

/* eslint no-unused-vars: 0 */

var mapConfig = {
    // Vector data layers (+ styles) imported from QGIS in OGC GeoPackage format.
    // (Generated directly in QGIS using Processing > Package Layers)
    gpkgFile: 'QGIS Packaged Layers (D+S Canal).gpkg',

    // Any additional SLD files
    sldFiles: ['sld/Probable path (10m nominal width).sld'],

    // Map View Projection
    displayProjection: 'EPSG:3857',

    // Initial map view [xmin, ymin, xmax, ymax]
    initialMapExtent: [-264129.300615, 6662945.427783, -257542.479715, 6667240.593291],

    // (Optional) DEBUG: Display (in console) template data for this file,
    // i.e. all tables in each Gpkg and their attributes
    //debugShowTableJson: true,

    // (Optional) DEBUG: display (in console) raw SLD for all layer_style tables
    //debugShowSLD: true,

    // Order, grouping and configuration of data layers
    dataLayersConfig: [
        {
            table: 'Notable features (SVG Marker)'
        },
        {
            table: 'Probable path evidence'
        },
        {
            table: 'Probable path evidence',
            styleName: 'Probable path (10m nominal width)'
        },
        {
            table: 'Planned route (1796 Parliament Act map)'
        },
        {
            table: 'Possible infrastructure'
        },
        {
            table: 'Possible canal centreline'
        },
        {
            table: '1840s Tithe (boundary lines)'
        },
        {
            table: '1840s Tithe (canal)'
        },
        {
            table: 'OS 1st edition (SVG Fill)'
        },
        {
            table: 'Mapping extent'
        }
    ],

    // Configuration of layer styling, for debug and for (optionally)
    // generating symbology icons for Legend and/or Layer Switcher
    sldStylerOptions: {
        // (Optional) DEBUG: display (in console) for all SLD-styled layers the
        // "featureTypeStyle" (i.e. styling from the SLD after parsing)
        //debugShowFeatureTypeStyle: true,

        // (Optional) custom tweaks to "featureTypeStyle" extracted from QGIS
        // "layer_styles" SLD style information in OGC GeoPackage
        tweakFeatureTypeStyle: function(styleName, featureTypeStyle) {
            switch (styleName) {

                // Scale stroke dasharrays by stroke width to overcome bug in QGIS
                // "package layers" export of predefined (not custom) dash patterns
                case 'Probable path evidence':
                case 'Mapping extent':
                case 'Possible infrastructure':
                case 'Possible canal centreline':
                    scaleLineSymbolizerDashArray(featureTypeStyle);
                    break;
            }
            return featureTypeStyle;

            /**
             * Scale all stroke dasharrays in FeatureTypeStyle by stroke width
             * (helper function to overcome bug in QGIS "package layers" export
             *  when using predefined (not custom) dash patterns)
             * @param {object} o - FeatureTypeStyle object
             */
            function scaleLineSymbolizerDashArray(o) {
                if (o.strokeDasharray && o.strokeWidth > 1) {
                    o.strokeDasharray = o.strokeDasharray.split(' ')
                        .map(x => parseFloat(x) * o.strokeWidth).join(' ');
                }
                for (var p in o) {
                    if (Object.prototype.hasOwnProperty.call(o, p) &&
                        typeof o[p] === 'object' ) {
                        scaleLineSymbolizerDashArray(o[p]);
                    }
                }
            }
        },

        // (Optional) overrides to olStyle for things not possible to define
        // in "featureTypeStyle" itself. Gets called for every visible feature
        // (i.e. olStyle array will not be empty)
        // Args:
        //  featureTypeStyle: symbol style definition
        //  olStyle: OpenLayers Styles array
        //  styleName: styleName (or if not defined: table) from dataLayersConfig
        //  feature: current Openlayers Feature (or example feature if createSymbol true)
        //  resolution: (real) resolution in metres/pixel
        //  resolutionChanged: has resolution changed for any styles used by current feature
        //  createSymbol: call is only to create a symbol for Layer Switcher / Legend
        //  symbolLabel: symbol label (only defined when createSymbol true)
        tweakOlStyle: function(featureTypeStyle, olStyle, styleName, feature,
            resolution, resolutionChanged, createSymbol, symbolLabel) {

            // Current layers only need adjusting when resolution (zoom) changes
            if (!resolutionChanged) {
                return olStyle;
            }

            switch (styleName) {
                case 'Notable features (SVG Marker)':
                    // Set Point Symbolizer displacement from SLD values
                    // exported by QGIS (currently ignored by sldreader)
                    setIconDisplacement(
                        featureTypeStyle.rules[0].pointsymbolizer.graphic.displacement,
                        olStyle[0].getImage());
                    break;

                // Scale width from pixels to metres
                // (for a projected SRS, resolution = metres/pixel)
                case 'Probable path (10m nominal width)':
                    if (createSymbol) {
                        resolution = (styleName === 'Visible remains')? 16.0 : 3.0;
                    }
                    olStyle[0].stroke_.width_ = featureTypeStyle.rules[0]
                        .linesymbolizer.stroke.styling.strokeWidth / resolution;
                    break;
            }
            return olStyle;

            /**
             * Set Point Symbolizer displacement from SLD displacement values
             * (as exported by QGIS) but currently ignored by sldReader
             * (Uses new setDisplacement() method introduced in OL 6.10.0)
             * @param {object} displacement - Feature Type Style rule
             *      pointsymbolizer.graphic.displacement object
             * @param {object} olStyleIcon - OpenLayers Style Icon Image object
             */
            function setIconDisplacement(displacement, olStyleIcon) {
                // Only define displacement once
                if (olStyleIcon.displacementDefined) {
                    return;
                }
                // Unlike SLD/QGIS/GeoServer, OpenLayers applies displacement
                // before scaling, so have to factor in image scale.
                // Note that QGIS/GeoServer define Point Symbolizer Y
                // displacement as downwards positive, so we negate it here.
                // (It was not defined in SLD 1.0.0 specification, though
                //  SLD SE 1.1.0 unfortunately defined it as upwards positive.)
                var scale = olStyleIcon.getScale();
                var olDispX = Number(displacement.displacementx) / scale;
                var olDispY = -Number(displacement.displacementy) / scale;
                olStyleIcon.setDisplacement([olDispX, olDispY]);
                olStyleIcon.displacementDefined = true;
            }
        }
    }
};
