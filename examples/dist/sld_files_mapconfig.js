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
        // Turn on QGIS compatibility options to fix QGIS-specific SLD issues
        qgisCompatibility: {
            enable: true,

            // Redirect QGIS system SVG icon paths to URL relative path
            svgRedirectFolder: 'qgis_svg'
        },

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
             * @param {object} ftso - FeatureTypeStyle object
             */
            function scaleLineSymbolizerDashArray(ftso) {
                // For any stroke dasharray in current object with stroke
                // width > 1, scale dasharray values by stroke width
                if (ftso.strokeDasharray && ftso.strokeWidth > 1) {
                    ftso.strokeDasharray = ftso.strokeDasharray.split(' ')
                        .map(x => parseFloat(x) * ftso.strokeWidth).join(' ');
                }

                // Recursively check any properties that are themselves
                // non-null objects for stroke dasharrays to scale
                for (var prop in ftso) {
                    if (Object.prototype.hasOwnProperty.call(ftso, prop) &&
                        typeof ftso[prop] === 'object' && ftso[prop]) {
                        scaleLineSymbolizerDashArray(ftso[prop]);
                    }
                }
            }
        }
    }
};
