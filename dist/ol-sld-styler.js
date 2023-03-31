/**
 * @module ol-sld-styler
 * @overview Style OpenLayers vector layers using SLD data.
 *   Optionally generate a map legend and/or embed symbols in ol-LayerSwitcher.
 *   Inputs are collections of OpenLayers "vector sources", SLDs and a
 *   "layer definitions" object. Module is primarily designed to easily render
 *   data/styles from QGIS exported as a GeoPackage using "Package Layers".
 */

// ESLint settings:
/* eslint no-unused-vars: 1 */

// Style Parser (SLD)
import * as SLDReader from '@nieuwlandgeo/sldreader';

import {getPointResolution} from 'ol/proj';
import {DEVICE_PIXEL_RATIO as ol_has_DEVICE_PIXEL_RATIO} from 'ol/has';
import {toContext as ol_render_toContext} from 'ol/render';
import {extend as ol_extent_extend} from 'ol/extent';
import ol_geom_Point from 'ol/geom/Point';
import ol_geom_LineString from 'ol/geom/LineString';
import ol_geom_Polygon from 'ol/geom/Polygon';
import ol_layer_Vector from 'ol/layer/Vector';
import ol_layer_Group from 'ol/layer/Group';
import ol_style_Icon from 'ol/style/Icon';

// -------- Private Variables --------

/**
 * Details of layer symbols where rendering is dependent on zoom level
 * @type {object[]}
 * @property {boolean}  id - symbol ID
 * @property {number}  minscaledenominator - min scale at which visible
 * @property {number}  maxscaledenominator - min scale at which visible
 */
var zoomModifySymbolInfo = [];

/**
 * Counter for generating unique HTML id tag for each layer
 */
var layerIdCount = 1;

/**
 * Counter for generating unique HTML id tags for each layer symbology type
 * @type {number}
 */
var symbolIdCount = 1;

/**
 * Layer Switcher update helper: maps checkboxes to OpenLayers layers/groups
 * (key = "id" field from layer definition)
 * @type {object}
 * @property {HTMLElement} checkboxElem - LayerSwitcher layer/group checkbox
 * @property {ol_layer_Vector} olLayerOrGroup - associated OpenLayers layer or
 *   layer group
 */
var layerSwitcherLookup = {};

/**
 * Default symbol canvas sizing (in CSS pixels) for Layer Switcher
 * @type {object}
 * @property {number} width - canvas width (not including margin)
 * @property {number} height - canvas height (not including margin)
 * @property {number} margin - margin on all 4 sides
 */
var lyrSwiSymbolSizing = {
    width: 20,
    height: 18,
    margin: 2
};

/**
 * Default symbol canvas sizing (in CSS pixels) for Legend
 * @type {object}
 * @property {number} width - canvas width (not including margin)
 * @property {number} height - canvas height (not including margin)
 * @property {number} margin - margin on all 4 sides
 */
var legendSymbolSizing = {
    width: 30,
    height: 18,
    margin: 2
};

/**
 * Main store for internal information on data layers being styled.
 * Initially, just layer config parsed from input to createAllLayers().
 * Includes data layer order, grouping and various configuration options.
 * @type {object[]}
 */
var dataLayerDefinitions;

// -------- Public Functions --------
export { createAllLayers, styleLayers, showLayerSwitcherSymbols, insertLegend,
    checkForMissingData };

/**
 * Parse data layer definitions and create the required placeholder layers and
 * groups. Placeholder layers will have a 'title' property defined as the
 * layer/group name prefixed by the text "(Loading...)". This `title` property
 * is only used by the ol-LayerSwitcher if that is used.
 * @param {object[]} dataLayersConfig - user definition of data layer & groups
 * @returns {ol_layer_Vector[]} ordered list of OpenLayers data layers/groups
 * @returns {ol_layer_Vector[]} layers defined as click-selectable in the map
 *   (for displaying a properties popup).
 */
function createAllLayers(dataLayersConfig) {
    // Layers for which click-selection is enabled
    var selectableLayers;
    var dataLayerList;

    const dataLayerDefs = parseDataLayerDefs(dataLayersConfig);
    [dataLayerList, selectableLayers] = buildDataLayerPlaceholders(
        dataLayerDefs);

    // Store internal layer definitions for use on later calls to module
    dataLayerDefinitions = dataLayerDefs;

    return [dataLayerList, selectableLayers];
}

/**
 * Connect newly supplied data sources to layers previously created from
 * dataLayersConfig and style them using data source-specific SLDs, but allow
 * for additionally supplied SLDs to override these. When using QGIS
 * "Package Layers" GeoPackage output, the layer_styles table would contain the
 * source-specific SLDs with "style name" = "table name". Overriding SLDs
 * (potentially sourced from individual SLD files) will automatically override
 * source-specific SLDs if they have the same style name, or can be mapped to
 * do so in the previously parsed dataLayersConfig. Workarounds for limitations
 * of SLD styling can be implemented in supplied 'tweak' functions.
 * @param {ol_view} view - target OpenLayers map view
 * @param {string} sourceDescription - (for diagnostics only) lineage of source,
 *      e.g. filename
 * @param {object} dataSources - OpenLayers vector sources (key = table name)
 * @param {object} sldLayerStyles - data source-specific SLDs (key = style name)
 * @param {object} sldStylesOverride - additional higher priority SLDs (key = style name)
 * @param {object} options - settings for styling vector layers, for debug and
 *   for generating symbol canvases for other controls
 * @param {boolean} options.addLayerSwitcherSymbols - generate symbology icons
 *   for adding to ol-layerswitcher (Layer Switcher) layers
 * @param {boolean} options.showLegend - generate symbology icons for
 *   ol-sld-styler/Legend
 * @param {object} options.lyrSwiSymbolSizing - Layer Switcher symbol canvas
 *   sizing in CSS pixels
 * @param {number} options.lyrSwiSymbolSizing.width - line/polygon drawn width
 * @param {number} options.lyrSwiSymbolSizing.height - polygon drawn height
 * @param {number} options.lyrSwiSymbolSizing.margin - added margin on all sides
 * @param {object} options.legendSymbolSizing - ol-sld-styler/Legend symbol
 *  canvas size in CSS pixels
 * @param {number} options.legendSymbolSizing.width - line/polygon drawn width
 * @param {number} options.legendSymbolSizing.height - polygon drawn height
 * @param {number} options.legendSymbolSizing.margin - added margin on all sides
 * @param {Function} options.tweakFeatureTypeStyle - function to modify
 *      sldReader-extracted FeatureTypeStyles
 * @param {Function} options.tweakOlStyle - function to modify generated
 *      olStyle definitions
 * @param {boolean} options.debugShowFeatureTypeStyle - write to browser
 *      console sldReader-extracted FeatureTypeStyles
 */
function styleLayers(view, sourceDescription, dataSources, sldLayerStyles,
    sldStylesOverride, options) {
    const layerDefsToBeStyled = updatePlaceholders(sourceDescription,
        dataSources, dataLayerDefinitions);
    styleVectorLayers(view, layerDefsToBeStyled, sldLayerStyles,
        sldStylesOverride, options);
}

/**
 * Add symbology icons to ol-layerswitcher Layer Switcher
 * @param {object} map - target OpenLayers map
 * @param {ObjectConstructor} LayerSwitcher - ol-layerswitcher constructor
 */
function showLayerSwitcherSymbols(map, LayerSwitcher) {

    // Make minimal auto-updates of layerSwitcher panel which would otherwise
    // overwrite our customized version
    LayerSwitcher.renderPanel = function() {
        // Set 'indeterminate' flag in each OL layer/group
        LayerSwitcher.setChildVisibility(map);

        // Copy 'indeterminate' flag from layer/group to layer
        // switcher "checkbox" elements
        for (const id in layerSwitcherLookup) {
            const layerProps = layerSwitcherLookup[id].olLayerOrGroup
                .getProperties();
            layerSwitcherLookup[id].checkboxElem.indeterminate =
                layerProps.indeterminate;
        }
    };

    // Put a map-specific "name" value into base layers to allow default radio
    // button operation of only selecting 1 base layer at a time
    const mapElem = map.getTargetElement();
    const baseLyrGroups = mapElem
        .getElementsByClassName("layer-switcher-base-group");
        for (const baseLyrGroup of baseLyrGroups) {
        const baseLyrInputs = baseLyrGroup.getElementsByTagName("input");
        for (const baseLyrInput of baseLyrInputs) {
            baseLyrInput.name = mapElem.getAttribute('id') + "-base";
        }
    }

    // Add symbology icon(s) to each layer
    addLayerSwitcherSymbols(map, dataLayerDefinitions);
}

/**
 * Generate map legend for all layers/groups defined in the previously parsed
 * dataLayersConfig data layers definition.
 * @param {object} map - target OpenLayers map
 * @param {HTMLElement} legendContainerElem - container for legend
 */
function insertLegend(map, legendContainerElem) {
    // Get real resolution in metres/pixel at view centre
    // (e.g. overcome huge distances distortion of EPSG3857 projection)
    const view = map.getView();
    const realResolution = getRealResolution(view);

    const legendTable = document.createElement('ul');
    legendTable.className = "legend-table";
    legendContainerElem.appendChild(legendTable);

    buildLegendGroup(legendTable, dataLayerDefinitions, realResolution);
    updateZoomDependentSymbols(map, { legend: true });
}

/**
 * Detect if any tables defined in dataLayersConfig are still missing,
 * replacing any remaining Layer Switcher "(Loading...)" placeholders with
 * "(No Data)" to highlight any data loading / layer mis-configuration problems.
 * @returns {boolean} true if data tables missing
 */
function checkForMissingData() {
    return checkGroupForMissingData(dataLayerDefinitions);
}

// -------- Private Functions --------

/**
 * Get real resolution in metres/pixel at view centre
 * (e.g. overcome huge distances distortion of EPSG3857 projection)
 * @param {ol_view} view - map view
 * @returns {number} real resolution in metres/pixel at view centre
 */
function getRealResolution(view) {
    const viewResolution = view.getResolution();
    const viewCenter = view.getCenter();
    const mapDisplayProjection = view.getProjection();
    const realResolution = getPointResolution(mapDisplayProjection,
        viewResolution, viewCenter);
    return realResolution;
}

/**
 * Parse and error check user-defined data layer definitions
 * @param {object[]} dataLayersConfig - user definition of data layer & groups
 * @returns {object[]} reworked definition with inferred fields all populated
 */
function parseDataLayerDefs(dataLayersConfig) {
    // Reworked definition from "config" with inferred fields all populated
    var layerDefsArray = [];

    for (const layerConfig of dataLayersConfig) {
        const layerDef = {
            id: layerIdCount.toString()
        };
        layerIdCount++;

        // Parse groups by recursive call
        if (typeof layerConfig.group !== 'undefined' &&
            layerConfig.group !== null &&
            typeof layerConfig.label !== 'undefined' &&
            layerConfig.label !== null)
        {
            layerDef.label = layerConfig.label;
            if (typeof layerConfig.fold !== 'undefined' &&
                layerConfig.fold !== null)
            {
                layerDef.fold = layerConfig.fold;
            } else {
                layerDef.fold = 'open';
            }
            layerDef.group = parseDataLayerDefs(layerConfig.group);
        }

        // Parse individual layers
        // (Must have eventual data source table defined)
        else if (typeof layerConfig.table !== 'undefined' &&
            layerConfig.table !== null)
        {
            if (typeof layerConfig.label !== 'undefined' &&
                layerConfig.label !== null)
            {
                layerDef.label = layerConfig.label;
            } else {
                layerDef.label = layerConfig.table;
            }

            // Allow for layers to have common table_name but different styles
            if (typeof layerConfig.styleName !== 'undefined' &&
                layerConfig.styleName !== null)
            {
                layerDef.styleName = layerConfig.styleName;
            } else {
                layerDef.styleName = layerConfig.table;
            }

            // Copy across other possible fields
            for (const prop of ['table', 'popupAttr', 'forceSingleSymbol',
                'collapseSymbology', 'olLayerOptions']) {
                const propValue = layerConfig[prop];
                if (typeof propValue !== 'undefined' && propValue !== null)
                    layerDef[prop] = propValue;
            }
        } else {
            throw new Error(
                'Invalid data layer/group definition beginning:\n' +
                JSON.stringify(layerConfig));
        }

        // Ensure common layer/group parameters all defined
        if (typeof layerConfig.visible !== 'undefined' &&
            layerConfig.visible !== null)
        {
            layerDef.visible = Boolean(layerConfig.visible);
        } else {
            layerDef.visible = true;
        }
        if (typeof layerConfig.selectable !== 'undefined' &&
            layerConfig.selectable !== null)
        {
            layerDef.selectable = Boolean(layerConfig.selectable);
        } else {
            layerDef.selectable = true;
        }
        layerDefsArray.push(layerDef);
    }

    return layerDefsArray;
}

/**
 * Create placeholder OpenLayers layers and groups from information in
 * "layer definitions" object (these will be updated when the required vector
 * data has been loaded). Includes putting popupAttr as a property in each
 * OpenLayers layer. (Called recursively for each group found).
 * @param {object[]} layerDefsGrp - layer definitions for data layers & groups
 * @returns {ol_layer_Vector[]} ordered list of OpenLayers data layers/groups
 * @returns {ol_layer_Vector[]} layers defined as click-selectable in the map
 */
function buildDataLayerPlaceholders(layerDefsGrp) {
   // Ordered list of OpenLayers data layers/groups within this group
    var dataLayerList = [];

    // Layers for which click-selection is enabled
    var selectableLayers = [];

     for (const layerDef of layerDefsGrp) {
        if (typeof layerDef.group !== 'undefined') {
            var groupLayers;
            var groupselectableLayers;
            [groupLayers, groupselectableLayers] = buildDataLayerPlaceholders(
                layerDef.group);
            selectableLayers = selectableLayers.concat(groupselectableLayers);

            // Create layer group empty <span> (just to temporarily embed ID)
            const groupTitle = '<span id="group-loading-' + layerDef.id +
                '"></span>' + layerDef.label;
            const olLayerGroup = new ol_layer_Group({
                layers: groupLayers,
                'fold': layerDef.fold,
                visible: layerDef.visible,
                title: groupTitle
            });
            dataLayerList.unshift(olLayerGroup);
            layerDef.olLayerGroup = olLayerGroup;
        } else {
            // Create placeholder for layer (with visibility turned off)
            // until data and styling for layer are both available
            const layerTitle = '<span id="layer-loading-' + layerDef.id +
                '" class="loading"></span>' + layerDef.label;
            const layerOptions = {
                source: null,
                //interactive: true,
                visible: false,
                title: layerTitle
            };
            if (typeof layerDef.olLayerOptions != 'undefined') {
                Object.assign(layerOptions, layerDef.olLayerOptions);
            }
            const layerPlaceholder = new ol_layer_Vector(layerOptions);
            if (typeof layerDef.popupAttr != 'undefined') {
                layerPlaceholder.setProperties({popupAttr: layerDef.popupAttr});
            }
            dataLayerList.unshift(layerPlaceholder);
            layerDef.olLayer = layerPlaceholder;
            if (layerDef.selectable) {
                selectableLayers.push(layerPlaceholder);
            }
        }
    }
    return [dataLayerList, selectableLayers];
}

/**
 * Update placeholder layers, setting the source of any that have
 * table names matching those found in the supplied vector sources object
 * @param {string} sourceDescription - sources lineage (for diagnostics only)
 * @param {object} dataSources - OpenLayers vector sources (key = table name)
 * @param {object[]} layerDefsAll - layer definitions for all data layers
 * @returns {object[]} only those layer definitions matching the data sources
 */
function updatePlaceholders(sourceDescription, dataSources, layerDefsAll) {
    var layerDefsToBeStyled = [];
    for (const tableName in dataSources) {
        const matchedLayerDefs = setLayerSources(tableName,
            dataSources[tableName], layerDefsAll);
        if (matchedLayerDefs.length) {
            layerDefsToBeStyled = layerDefsToBeStyled
                .concat(matchedLayerDefs);
        } else {
            console.log('INFO: Unused table "' + tableName +
                '" loaded from ' + sourceDescription);
        }
    }
    return layerDefsToBeStyled;
}

/**
 * Assign newly loaded table to any associated placeholder layers in layer group
 * @param {string} tableName - data layer table name
 * @param {ol_source_Vector} source - OpenLayers vector source
 * @param {object[]} layerDefsGrp - layer definitions for current layer group
 * @returns {object[]} only those layer definitions matching the data source
 */
function setLayerSources(tableName, source, layerDefsGrp) {
    var matchedLayerDefs = [];

    for (const layerDef of layerDefsGrp) {
        // Recurse for layer groups
        if (typeof layerDef.group !== 'undefined') {
            const grpMatchedLayerDefs = setLayerSources(
                tableName, source, layerDef.group);
            matchedLayerDefs = matchedLayerDefs.concat(grpMatchedLayerDefs);
        } else if (tableName === layerDef.table) {
            if (!layerDef.olLayer.getSource()) {
                matchedLayerDefs.push(layerDef);
            } else {
                console.warn('Overwriting already loaded table: ' + tableName);
            }
            layerDef.olLayer.setSource(source);
        }
    }
    return matchedLayerDefs;
}

/**
 * Style specified layers using data source-specific SLDs, but allow for
 * additionally supplied SLDs to override these. When using QGIS
 * "Package Layers" GeoPackage output, the layer_styles table would contain the
 * source-specific SLDs with "style name" = "table name". Overriding SLDs
 * (potentially sourced from individual SLD files) will automatically override
 * source-specific SLDs if they have the same style name, or can be mapped to
 * do so in the previously parsed dataLayersConfig. Workarounds for limitations
 * of SLD styling can be implemented in supplied 'tweak' functions.
 * @param {ol_view} view - target OpenLayers map view
 * @param {object} layerDefs - definition of vector layers to be styled
 * @param {object} sldLayerStyles - data source-specific SLDs (key = style name)
 * @param {object} sldStylesOverride - additional higher priority SLDs (key = style name)
 * @param {object} options - settings for styling vector layers, for debug and
 *   for generating symbol canvases for other controls
* @param {boolean} options.addLayerSwitcherSymbols - generate symbology icons
 *   for adding to ol-layerswitcher (Layer Switcher) layers
 * @param {boolean} options.showLegend - generate symbology icons for
 *   ol-sld-styler/Legend
 * @param {object} options.lyrSwiSymbolSizing - Layer Switcher symbol canvas
 *   size in CSS pixels
 * @param {number} options.lyrSwiSymbolSizing.width - line/polygon drawn width
 * @param {number} options.lyrSwiSymbolSizing.height - polygon drawn height
 * @param {number} options.lyrSwiSymbolSizing.margin - added margin on all sides
 * @param {object} options.legendSymbolSizing - ol-sld-styler/Legend symbol
 *  canvas size in CSS pixels
 * @param {number} options.legendSymbolSizing.width - line/polygon drawn width
 * @param {number} options.legendSymbolSizing.height - polygon drawn height
 * @param {number} options.legendSymbolSizing.margin - added margin on all sides
 * @param {Function} options.tweakFeatureTypeStyle - function to modify
 *      sldReader-extracted FeatureTypeStyles
 * @param {Function} options.tweakOlStyle - function to modify generated
 *      olStyle definitions
 * @param {boolean} options.debugShowFeatureTypeStyle - write to browser
 *      console sldReader-extracted FeatureTypeStyles
 */
function styleVectorLayers(view, layerDefs, sldLayerStyles, sldStylesOverride,
    options)
{
    options = options || {};
    const addLayerSwitcherSymbols = options.addLayerSwitcherSymbols;
    const generateSymbologyIcons = options.showLegend ||
        options.addLayerSwitcherSymbols;

    // Override default symbol sizing with anything specified in the options
    const lyrSwiSymbolOptions = options.lyrSwiSymbolSizing || {};
    const legendSymbolOptions = options.legendSymbolSizing || {};
    Object.assign(lyrSwiSymbolSizing, lyrSwiSymbolOptions);
    Object.assign(legendSymbolSizing, legendSymbolOptions);

    for (const layerDef of layerDefs) {
        const olLayer = layerDef.olLayer;
        const styleName = layerDef.styleName;
        const exampleFeature = olLayer.getSource().getFeatures()[0];
        if (!exampleFeature) {
            // Skip any layers that have no features
            console.error('No features in table: "' + layerDef.table +
                '" (layer: "' + layerDef.label + '")');

            if (addLayerSwitcherSymbols) {
                // For LayerSwitcher with symbols
                // "(Loading...)" replaced with "(No Features)"
                const layerLoadingElem = document.getElementById(
                    'layer-loading-' + layerDef.id);
                layerLoadingElem.className = "no-features";
            }

            // For any simple layerSwitcher without symbology and popups,
            // replace "(Loading...)" with "(No Features)" on redraw
            const layerTitle = '<span class="no-features"></span>' +
                layerDef.label;
            olLayer.set('title', layerTitle);
            continue;
        }
        var layerSld = sldStylesOverride[styleName];
        // Only use main SLD style if no override exists
        if (!layerSld) {
            layerSld = sldLayerStyles[styleName];
        }
        if (!layerSld) {
            console.error('Layer styleName does not exist: "' +
                styleName + '"');

            if (addLayerSwitcherSymbols) {
                // For LayerSwitcher with symbols
                // "(Loading...)" replaced with "(Style Missing)"
                const layerLoadingElem = document.getElementById(
                    'layer-loading-' + layerDef.id);
                layerLoadingElem.className = "style-missing";
            }

            // For any simple layerSwitcher without symbology and popups,
            // replace "(Loading...)" with "(Style Missing)" on redraw
            const layerTitle = '<span class="style-missing"></span>' +
                layerDef.label;
            olLayer.set('title', layerTitle);

            // Force visible to emphasize missing style
            olLayer.setVisible(true);
            continue;
        }

        // Use "SLDreader" to build "featureTypeStyle" object
        // and apply a derived olStyleFn to the layer
        const featureTypeStyle = applySLD(view, styleName, olLayer, layerSld,
            options);

        // Make layer visible for the first time (if turned on)
        if (layerDef.visible) {
            olLayer.setVisible(true);

            if (addLayerSwitcherSymbols) {
                // For embedded-symbol LayerSwitcher need to modify checkbox as
                // will disable its normal redraw rendering.
                // Use "loading" <span> from layer label to find checkbox
                // element, then delete "loading" <span> (thus removing
                // "(Loading..)" text)
                const layerLoadingElem = document.getElementById(
                    'layer-loading-' + layerDef.id);
                const checkboxElem = layerLoadingElem.parentNode.previousSibling;
                checkboxElem.checked = true;
            }
        }

        // For current layer, extract from each SLD-derived rule the
        // symbology and min/max resolutions at which each symbol is
        // actually rendered (for Map Legend and/or Layer Switcher)
        if (generateSymbologyIcons) {
            extractLayerSymbology(featureTypeStyle.rules, layerDef,
                exampleFeature, options.tweakOlStyle,
                getRealResolution(view));
        }

        // Remove "(Loading...)" from layer switcher now for any simple
        // layerSwitcher without symbology and for popups
        olLayer.set('title', layerDef.label);
    }
}

/**
 * Apply SLD-derived style to layer
 * @param {object} view - target OpenLayers map view
 * @param {string} styleName - vector data table name
 * @param {ol_layer_Vector} olVectorLayer - OpenLayers vector layer
 * @param {string} rawSldXml - raw SLD XML text
 * @param {Function} options.tweakFeatureTypeStyle - function to modify
 *      sldReader-extracted FeatureTypeStyles
 * @param {Function} options.tweakOlStyle - function to modify generated
 *      olStyle definitions
 * @param {boolean} options.debugShowFeatureTypeStyle - write to browser
 *      console sldReader-extracted FeatureTypeStyles
 * @returns {object} SLDreader "feature type style" rules for layer
 */
function applySLD(view, styleName, olVectorLayer, rawSldXml, options) {
    // Use "SLDreader" (https://github.com/NieuwlandGeo/SLDReader) to build
    // "featureTypeStyle" definition from SLD XML string
    const sldObject = SLDReader.Reader(rawSldXml);
    const sldLayer = SLDReader.getLayer(sldObject);

    // QGIS exports an empty style name "", so need to set it as default
    sldLayer.styles[0].default = true;

    const sldStyle = SLDReader.getStyle(sldLayer);
    var featureTypeStyle = sldStyle.featuretypestyles[0];
    if (options.debugShowFeatureTypeStyle) {
        console.log('DEBUG: featureTypeStyle of layer "' + styleName + '" =');
        console.log(JSON.stringify(featureTypeStyle));
    }

    // If custom "tweakFeatureTypeStyle" function defined, use it to tweak the
    // "featureTypeStyle" extracted from SLD style information.
    if (typeof options.tweakFeatureTypeStyle === 'function') {
        featureTypeStyle = options.tweakFeatureTypeStyle(styleName,
            featureTypeStyle);
    }

    // Get SLDreader to build an OpenLayers "olStyle" function based on
    // the layer "featureTypeStyle" definition
    const sldReaderStyleFn = SLDReader.createOlStyleFunction(featureTypeStyle, {

        // Convert to real resolution in metres/pixel at view centre
        // (e.g. overcome huge distances distortion of EPSG3857 projection)
        convertResolution: () => getRealResolution(view),

        // If symbology includes an ExternalGraphic, imageLoadedCallback() will
        // update the vector layer when the image finishes loading.
        // (If symbol canvases are being generated elsewhere for Legend or
        // Layer Switcher, then that function's imageLoadedCallback() will
        // take preference)
        imageLoadedCallback: () => {
            olVectorLayer.changed();
        }
    });

    // Set the OpenLayers olStyle function for this layer.
    // If custom "tweakOlStyle" function defined, use it to modify the output
    // olStyle for things not possible to define in "featureTypeStyle" itself.
    var olStyleFn;
    if (typeof options.tweakOlStyle !== 'function') {
        olStyleFn = sldReaderStyleFn;
    } else {
        olStyleFn = function (feature, viewResolution) {
            var olStyle = sldReaderStyleFn(feature, viewResolution);
            if (olStyle.length) {

                // Detect if resolution has changed for any of styles used
                // by current feature
                var resolutionChanged = false;
                for (var i = 0; i < olStyle.length; i++) {
                    if (olStyle[i].lastResolution !== viewResolution) {
                        olStyle[i].lastResolution = viewResolution;
                        resolutionChanged = true;
                    }
                }
                olStyle = options.tweakOlStyle(featureTypeStyle, olStyle,
                    styleName, feature, getRealResolution(view),
                    resolutionChanged, false);
            }
            return olStyle;
        };
    }
    olVectorLayer.setStyle(olStyleFn);
    return featureTypeStyle;
}

/**
 * Generate symbols and symbol-folding for ol-layerswitcher
 * (only called once - at start-up)
 * @param {ol_Map} map - target OpenLayers map
 * @param {object[]} layerDefs - information array for vector feature layers
 */
function addLayerSwitcherSymbols(map, layerDefs) {
    // Process layers first (i.e. exclude layer groups)
    const symbolLayers = getSymbolLayers(layerDefs);
    const realResolution = getRealResolution(map.getView());
    const mockSymbolCanvasCssWidth = lyrSwiSymbolSizing.width +
        2 * lyrSwiSymbolSizing.margin + "px";

    for (const layerDef of symbolLayers) {
        // Use "loading" <span> from layer label to find checkbox element,
        // then delete "loading" <span> (thus removing "(Loading..)" text)
        const layerLoadingElem = document.getElementById('layer-loading-' +
                layerDef.id);
            const layerLabelElem = layerLoadingElem.parentNode;
            const layerParentElem = layerLabelElem.parentNode;
                layerSwitcherLookup[layerDef.id] = {
            checkboxElem: layerLoadingElem.parentNode.previousSibling,
            olLayerOrGroup: layerDef.olLayer
        };
        layerLoadingElem.remove();

        const exampleFeature = layerDef.olLayer.getSource().getFeatures()[0];
        if (layerDef.symbologyType === 'noSymbol') {
            layerLabelElem.classList.add('label-no-symbol');
            // TBD: add "symbol id" for zoom-modify (layer switcher only)
            //      for greying noSymbol layers, e.g. text labels when zoomed in
            //layerLabelElem.id = 'ls-sym-label-' + layerDef.symbols[0].id;

            // Insert dummy symbol canvas to ensure correct spacing
            const mockSymbolCanvas = document.createElement('span');
            mockSymbolCanvas.className = 'symbol-canvas mock-symbol-canvas';
            mockSymbolCanvas.style.width = mockSymbolCanvasCssWidth;

            // Insert symbol graphic between checkbox and label
            layerParentElem.insertBefore(mockSymbolCanvas,
                layerParentElem.lastChild);
        }
        else if (layerDef.symbologyType === 'singleSymbol' ||
            layerDef.forceSingleSymbol) {

            layerLabelElem.classList.add('label-single-symbol');
            layerLabelElem.id = 'ls-sym-label-' + layerDef.symbols[0].id;
            layerParentElem.classList.add('li-single-symbol');
            const symbol = layerDef.symbols[0];
            const symbolCanvas = createSymbol(lyrSwiSymbolSizing,
                symbol.symbolStyleFn, exampleFeature, realResolution);

            // Insert symbol graphic between checkbox and label
            layerParentElem.insertBefore(symbolCanvas,
                layerParentElem.lastChild);

            // Save pointer to Canvas in case we need to update it
            symbol.layerSwitcherCanvas = symbolCanvas;
        } else {
            // 'multiSymbol'
            layerLabelElem.classList.add('label-multi-symbol-layer');

            // Insert symbololgy toggle graphic between checkbox and label
            const symbologyToggle = document.createElement('button');
            symbologyToggle.className = 'symbology-toggle';
            layerParentElem.insertBefore(symbologyToggle,
                layerParentElem.lastChild);

            const symbologyList = document.createElement('ul');
            symbologyList.className = "ul-multi-symbol";
            if (layerDef.collapseSymbology) {
                symbologyToggle.classList.add("symbology-opener");
                symbologyList.classList.add('symbology-collapsed');
            }

            for (const symbol of layerDef.symbols) {
                const symbolLi = document.createElement('li');
                symbolLi.id = 'ls_symbol_' + symbol.id;
                const symbolCanvas = createSymbol(lyrSwiSymbolSizing,
                    symbol.symbolStyleFn, exampleFeature, realResolution);

                symbolLi.appendChild(symbolCanvas);
                const symbolLabel = document.createElement('span');
                symbolLabel.className = 'label-multi-symbol';
                symbolLabel.innerText = symbol.label;
                symbolLabel.id = 'ls-sym-label-' + symbol.id;
                symbolLi.appendChild(symbolLabel);
                symbologyList.appendChild(symbolLi);

                // Save pointer to Canvas in case we need to update it
                // e.g. on eventual load of external graphics
                symbol.layerSwitcherCanvas = symbolCanvas;
            }
            layerParentElem.appendChild(symbologyList);

            symbologyToggle.onclick = function (e) {
                const evt = e || window.event;
                symbologyToggle.classList.toggle("symbology-opener");
                symbologyList.classList.toggle("symbology-collapsed");
                evt.preventDefault();
            };
        }
    }
    updateZoomDependentSymbols(map, { layerSwitcher: true });

    // Process layer groups
    // Use "loading" <span> from group label to find checkbox element,
    // then delete "loading" <span>
    const layerGroups = getSymbolLayerGroups(layerDefs);
    for (const groupDef of layerGroups) {
        const groupLoadingElem = document.getElementById('group-loading-' +
            groupDef.id);
        layerSwitcherLookup[groupDef.id] = {
            checkboxElem: groupLoadingElem.parentNode.previousSibling,
            olLayerOrGroup: groupDef.olLayerGroup
        };
        groupLoadingElem.remove();
    }
}

/**
 * Add all layers within group to legend
 * (including layers currently set to not visible or out of scale range)
 * @param {HTMLTableElement} legendGroupElem - container for legend rendering
 * @param {object} layerGroup - group within feature layers vector info array
 * @param {number} realResolution - real resolution in metres/pixel
 */
function buildLegendGroup(legendGroupElem, layerGroup, realResolution) {
    var exampleFeature;
    for (const layerDef of layerGroup) {
        const row = document.createElement('li');

        // For a valid layer, get an example feature for creating symbol.
        // Skip layer if no features.
        if (typeof layerDef.group === 'undefined') {
            if (typeof layerDef.symbologyType === 'undefined') {
                continue;
            }
            exampleFeature = layerDef.olLayer.getSource().getFeatures()[0];
        }

        // For layer groups, add title and recurse
        if (typeof layerDef.group !== 'undefined') {
            row.className = 'legend-row-group';
            row.id = 'legend-group-' + layerDef.id;
            const label = document.createElement('span');
            label.innerHTML = layerDef.label;
            row.appendChild(label);
            const groupList = document.createElement('ul');
            buildLegendGroup(groupList, layerDef.group,
                realResolution);
            if (groupList.childElementCount) {
                row.appendChild(groupList);
                legendGroupElem.appendChild(row);
            } else {
                // Group was empty or failed to load data
                continue;
            }
        }
        else if (typeof layerDef.symbologyType === 'undefined') {
            // Any layers for which styling was not done
            continue;
        }
        else if (layerDef.symbologyType === 'singleSymbol' ||
            layerDef.forceSingleSymbol) {

            row.className = 'label-single-symbol';
            row.id = 'legend-symbol-' + layerDef.symbols[0].id;
            const symbol = layerDef.symbols[0];
            const symbolCanvas = createSymbol(legendSymbolSizing,
                symbol.symbolStyleFn, exampleFeature, realResolution);

            // Save pointer to Canvas in case we need to update it
            // on load of external graphics
            symbol.legendCanvas = symbolCanvas;
            row.appendChild(symbolCanvas);
            const label = document.createElement('span');
            label.innerHTML = layerDef.label;
            row.appendChild(label);
            legendGroupElem.appendChild(row);
        } else if (layerDef.symbologyType === 'multiSymbol') {
            row.className = 'label-multi-symbol-layer';
            row.id = 'legend-layer-' + layerDef.id;
            const label = document.createElement('span');
            label.innerHTML = layerDef.label + ':';
            row.appendChild(label);

            const symbologyList = document.createElement('ul');
            symbologyList.className = "ul-multi-symbol";

            for (const symbol of layerDef.symbols) {
                const symbolLi = document.createElement('li');
                symbolLi.id = 'legend-symbol-' + symbol.id;
                const symbolCanvas = createSymbol(legendSymbolSizing,
                    symbol.symbolStyleFn, exampleFeature, realResolution);

                symbolLi.appendChild(symbolCanvas);
                const symbolLabel = document.createElement('span');
                symbolLabel.className = 'label-multi-symbol';
                symbolLabel.innerText = symbol.label;
                symbolLabel.id = 'legend-sym-label-' + symbol.id;
                symbolLi.appendChild(symbolLabel);
                symbologyList.appendChild(symbolLi);

                // Save pointer to Canvas in case we need to update it
                // on load of external graphics
                symbol.legendCanvas = symbolCanvas;
            }
            row.appendChild(symbologyList);
            legendGroupElem.appendChild(row);
        }

        // Show/hide legend elements on layer/group visibility changing
        if (row.id) {
            var olLayerOrGroup;
            if (layerDef.group) {
                olLayerOrGroup = layerDef.olLayerGroup;
            } else {
                olLayerOrGroup = layerDef.olLayer;
            }

            // Set initial legend visibility
            if (olLayerOrGroup.getVisible()) {
                row.classList.remove('switched-off');
            } else {
                row.classList.add('switched-off');
            }

            // Adjust legend visibility on change
            olLayerOrGroup.on('change:visible', function(ev) {
                if (ev.oldValue) {
                    row.classList.add('switched-off');
                } else {
                    row.classList.remove('switched-off');
                }
                legendParentVisibilityUpdate(row);
            });
        }
    }
}

/**
 * Which widget(s) to update at end of map zoom operations
 * @type {object}
 * @property {boolean} layerSwitcher - show/hide Layer Switcher symbols
 * @property {boolean} legend - show/hide Legend symbols
 */
var zoomUpdateOptions;

/**
 * Update ol-layerswitcher and/or legend zoom-dependent symbol labels at the
 * very end of a zoom operation (grey/italicize if not being rendered).
 * @param {ol_Map} map - target OpenLayers map
 * @param {object} options - which widget(s) to update on zooming:
 * @param {boolean} options.layerSwitcher - show/hide Layer Switcher symbols
 * @param {boolean} options.legend - show/hide Legend symbols
 */
function activateUpdateOnZoom(map, options) {
    options = options || {};
    if (typeof zoomUpdateOptions === 'undefined') {
        zoomUpdateOptions = {};
        var currResolution = map.getView().getResolution();
        map.on('moveend', function() {
            const newResolution = map.getView().getResolution();
            if (currResolution != newResolution) {
                currResolution = newResolution;
                updateZoomDependentSymbols(map, {
                    layerSwitcher: zoomUpdateOptions.layerSwitcher,
                    legend: zoomUpdateOptions.legend
                });
            }
        });
    }
    if (options.layerSwitcher) {
        zoomUpdateOptions.layerSwitcher = true;
    }
    if (options.legend) {
        zoomUpdateOptions.legend = true;
    }
}

/**
 * Show/Hide symbols + labels depending on zoom (resolution)
 * @param {ol_Map} map - target OpenLayers map
 * @param {object} options - which widget(s) to update
 * @param {boolean} options.layerSwitcher - show/hide Layer Switcher symbols
 * @param {boolean} options.legend - show/hide Legend symbols
 */
function updateZoomDependentSymbols(map, options) {
    options = options || {};

    // Get real resolution in metres/pixel at view centre
    // (e.g. overcome huge distances distortion of EPSG3857 projection)
    const view = map.getView();
    const realResolution = getRealResolution(view);
    const scaledenominator = realResolution / 0.00028;

    // Iterate over only symbols that change with zoom-level
    for (const symbol of zoomModifySymbolInfo) {
        const symbolHidden = scaledenominator < symbol.minscaledenominator ||
            scaledenominator > symbol.maxscaledenominator;

        // Layer Switcher: If symbol hidden, grey out & italicize label
        if (options.layerSwitcher) {
            const element = document.getElementById('ls-sym-label-' + symbol.id);
            if (element) {
                if (symbolHidden) {
                    element.classList.add('not-in-range');
                } else {
                    element.classList.remove('not-in-range');
                }
            } else {
                // (This should never occur)
                console.error('Unexpectedly missing Layer Switcher symbol' +
                    ' DOM element: ls-sym-label-' + symbol.id);
            }
        }

        // Legend: If symbol hidden, hide legend row.
        if (options.legend) {
            const element = document.getElementById('legend-symbol-' + symbol.id);
            if (element) {
                const currentlyHidden = element.classList.contains('not-in-range');
                if (currentlyHidden !== symbolHidden) {
                    if (symbolHidden) {
                        element.classList.add('not-in-range');
                    } else {
                        element.classList.remove('not-in-range');
                    }
                    // Ensure any parent rows (i.e. layers/groups) are also
                    // hidden if all children are hidden. Even if this symbol
                    // not hidden, don't know whether layer turned on or off
                    legendParentVisibilityUpdate(element);
                }
            }
            else {
                // (This should never occur)
                console.error('Unexpectedly missing legend symbol DOM' +
                    ' element: legend-symbol-' + symbol.id);
            }
        }
    }

    // Ensure symbols are updated on every zoom
    activateUpdateOnZoom(map, options);
}

/**
 * Ensure any (grand)parent layers/groups are appropriately hidden if all their
 * children are hidden or switched-off.
 * @param {HTMLElement} element - target child HTML element
 * @param {boolean} childVisible - only used for internal recursion
 */
function legendParentVisibilityUpdate(element, childVisible=false)
{
    const parentUl = element.parentNode;
    const grandparent = parentUl.parentNode;
    if (grandparent.tagName == "LI") {
        var anyChildVisible = childVisible;
        if (!childVisible) {
            for (const child of parentUl.children) {
                const childClasses = child.classList;
                if (!childClasses.contains("not-in-range") &&
                    !childClasses.contains("no-children-visible") &&
                    !childClasses.contains("switched-off")) {

                    anyChildVisible = true;
                    break;
                }
            }
        }
        const currentChildVisibility =
            !grandparent.classList.contains('no-children-visible');
        if (currentChildVisibility === anyChildVisible) {
            return;
        }

        // Mark (and potentially hide) child-visibility status of layer/group
        if (anyChildVisible) {
            grandparent.classList.remove('no-children-visible');
        } else {
            grandparent.classList.add('no-children-visible');
        }

        // Update 'no-children-visible' of all containing groups
        const grandparentVisible = anyChildVisible &&
            !grandparent.classList.contains("switched-off");
        legendParentVisibilityUpdate(grandparent, grandparentVisible);
    }
}

/**
 * Create canvas for a single symbol from layer symbology
 * (Based on ol-ext Legend.getLegendImage())
 * @param {object} cssSizing - symbol width, height and margin in CSS pixels
 * @param {Function} symbolStyleFn - olStyle function for just this symbol
 * @param {ol_Feature} exampleFeature - an OpenLayers feature from the layer
 * @param {number} realResolution - resolution in metres/pixel at view centre
 * @returns {canvas} symbol icon as an HTML canvas
 */
function createSymbol(cssSizing, symbolStyleFn, exampleFeature, realResolution)
{
    const canvasCssWidth = cssSizing.width + 2 * cssSizing.margin;
    const canvasCssHeight = cssSizing.height + 2 * cssSizing.margin;

    // May need to scale up the symbol canvas size to avoid clipping of
    // centre-point shifted point symbolizers
    var tempScaling = 1.0;

    const layerGeomType = exampleFeature.getGeometry().getType();
    var simplifiedTypeGeom;
    switch (layerGeomType) {
        case 'Point':
        case 'MultiPoint':
            simplifiedTypeGeom = 'Point';
            break;
        case 'LineString':
        case 'MultiLineString':
            simplifiedTypeGeom = 'LineString';
            break;
        case 'Polygon':
        case 'MultiPolygon':
            simplifiedTypeGeom = 'Polygon';
            break;
        default:
            simplifiedTypeGeom = 'Unsupported';
            break;
    }

    var styleRules;
    const symbolStyle = symbolStyleFn(exampleFeature, realResolution);
    if (symbolStyle instanceof Array)
        styleRules = symbolStyle;
    else
        styleRules = [symbolStyle];

    // Get centre point anchor offset of icons if it exists
    var cssOffsetX = 0;
    var cssOffsetY = 0;
    if (simplifiedTypeGeom === 'Point') {
        var extent = null;
        var img;
        for (const rule of styleRules) {
            img = rule.getImage();
            if (img && img.getAnchor) {
                const anchor = img.getAnchor();
                const si = img.getSize();
                const dx = anchor[0] - si[0];
                const dy = anchor[1] - si[1];
                if (!extent) {
                    extent = [dx, dy, dx + si[0], dy + si[1]];
                } else {
                    // Assumes scale same for all img instances in this symbol
                    ol_extent_extend(extent, [dx, dy, dx + si[0], dy + si[1]]);
                }
            }
        }
        if (extent) {
            // Assumes scale same for all img instances in this symbol
            const scale = img.getScale();
            const extentOffsetX = (extent[2] + extent[0]) / 2;
            const extentOffsetY = (extent[3] + extent[1]) / 2;
            cssOffsetX = extentOffsetX * scale;
            cssOffsetY = extentOffsetY * scale;

            // Increase canvas size during drawing if image extent would
            // otherwise overflow it (but later shrink it to fit requested
            // CSS size)
            const extentWidth = extent[2] - extent[0];
            const extentHeight = extent[3] - extent[1];
            tempScaling = Math.max(1.0,
                extentWidth * scale / cssSizing.width,
                extentHeight * scale / cssSizing.height);
        }
    }

    const symbolCanvas = document.createElement('canvas');
    symbolCanvas.className = 'symbol-canvas';

    // For unsupported geometry types, limp on with a blank icon
    if (simplifiedTypeGeom === 'Unsupported') {
        console.error('Unsupported geometry type: ' + layerGeomType);
        symbolCanvas.style.width = canvasCssWidth + "px";
        symbolCanvas.style.height = canvasCssHeight + "px";
        return symbolCanvas;
    }

    // Bind a Canvas Immediate API to a canvas context, to allow drawing
    // geometries to the context's canvas.
    // - size option is in CSS pixels (but if tempScaling > 1.0,
    //   pretend to renderer that it is bigger and we will shrink it later)
    // - Actual canvas size depends on pixelratio
    const ctx = symbolCanvas.getContext('2d');
    const vectorContext = ol_render_toContext(ctx, {
        size: [canvasCssWidth * tempScaling,
            canvasCssHeight * tempScaling],
            pixelRatio: ol_has_DEVICE_PIXEL_RATIO
        });

    // Remove any temporary enlargement by tempScaling
    if (tempScaling !== 1.0) {
        symbolCanvas.style.width = canvasCssWidth + "px";
        symbolCanvas.style.height = canvasCssHeight + "px";
    }

    // CSS canvas centre location
    var cx = canvasCssWidth * tempScaling / 2;
    var cy = canvasCssHeight * tempScaling / 2;

    // CSS half-width of symbol (not including margin)
    const sx = cssSizing.width / 2;
    const sy = cssSizing.height / 2;

    // Ensure symbol coordinates start in the middle of each pixel to ensure
    // maximum sharpness, especially for line widths of <= 1.0px
    const xmin = Math.floor(cx - sx) + 0.5;
    const xmax = Math.floor(cx + sx + 0.5) - 0.5;
    const ymin = Math.floor(cy - sy) + 0.5;
    const ymid = Math.floor(cy) + 0.5;
    const ymax = Math.floor(cy + sy + 0.5) - 0.5;
    const lineCoords = [[xmin, ymid], [xmax, ymid]];
    const polygonCoords = [[[xmin, ymin], [xmax, ymin], [xmax, ymax],
        [xmin, ymax], [xmin, ymin]]];

    // Draw symbol on canvas by parsing each rule in turn
    for (const rule of styleRules) {
        var customRenderer;
        vectorContext.setStyle(rule);
        switch (simplifiedTypeGeom) {
            case 'Point':
                cx = cx + cssOffsetX;
                cy = cy + cssOffsetY;
                vectorContext.drawGeometry(new ol_geom_Point([cx, cy]));
                break;
            case 'LineString':
                var lineStr = new ol_geom_LineString(lineCoords);

                // Handle custom renderers like GraphicStroke marks which
                // are not supported by CanvasImmediateRenderer Style.
                // (Its Device Pixel Ratio scaling is also problematic)
                customRenderer = rule.getRenderer();
                if (customRenderer) {
                    const state = ({
                        context: vectorContext.context_,
                        pixelRatio: 1, //ol_has_DEVICE_PIXEL_RATIO,
                        resolution: realResolution,
                        rotation: 0,
                        geometry: lineStr,
                        feature: exampleFeature
                    });
                    customRenderer(lineCoords, state);
                } else {
                    vectorContext.drawGeometry(lineStr);
                }
                break;
            case 'Polygon':
                var polygon = new ol_geom_Polygon(polygonCoords);
                customRenderer = rule.getRenderer();
                if (customRenderer) {
                    const state = ({
                        context: vectorContext.context_,
                        pixelRatio: 1, //ol_has_DEVICE_PIXEL_RATIO,
                        resolution: realResolution,
                        rotation: 0,
                        geometry: polygon,
                        feature: exampleFeature
                    });
                    customRenderer(polygonCoords, state);
                } else {
                    vectorContext.drawGeometry(polygon);
                }
                break;
        }
    }

    ctx.restore();
    return symbolCanvas;
}

/**
 * Get list of all (vector data) layers with a symbologyType
 * @param {object[]} layerDefs - information array for vector feature layers
 * @returns {object[]} subset of input layers that have a defined symbology type
 */
function getSymbolLayers(layerDefs) {
    var layerList = [];
    for (const layerDef of layerDefs) {
        // Recurse for layer groups
        if (typeof layerDef.group !== 'undefined') {
            const grpLayers = getSymbolLayers(layerDef.group);
            layerList = layerList.concat(grpLayers);
        } else if (typeof layerDef.symbologyType !== 'undefined') {
            layerList.push(layerDef);
        }
    }
    return layerList;
}

/**
 * Get list of all (vector data) layer groups
 * @param {object[]} layerDefs - information array for vector feature layers
 * @returns {object[]} subset of input array that are layer groups
 */
function getSymbolLayerGroups(layerDefs) {
    var groupList = [];
    for (const layerDef of layerDefs) {
        // Recurse for layer groups
        if (typeof layerDef.group !== 'undefined') {
            groupList.push(layerDef);
            const subGroups = getSymbolLayerGroups(layerDef.group);
            groupList = groupList.concat(subGroups);
        }
    }
    return groupList;
}

/**
 * For current layer, extract from each SLD-derived rule the symbology and
 * min/max resolutions at which each symbol is actually rendered
 * (for Map Legend and/or Layer Switcher)
 * @param {object[]} rules - layer symbology rules
 * @param {object} layerDef - vector feature layer definition for layer
 * @param {ol_Feature} exampleFeature - an OpenLayers feature from the layer
 * @param {number} tweakOlStyle - olStyle tweak function
 * @param {number} realResolution - resolution in metres/pixel at view centre
 */
function extractLayerSymbology(rules, layerDef, exampleFeature, tweakOlStyle,
    realResolution) {

    // Check to see if layer has multiple different symbol types
    // (Other layers have 1st rule name "Single Symbol" or undefined)
    const rule0name = rules[0].name;
    const multiSymbol = typeof rule0name !== 'undefined' &&
        rule0name !== 'Single symbol' && rule0name !== '';

    // Create zero or one symbols for each layer rule
    var symbols = [];
    for (const rule of rules) {
        // Extract rule with only symbolizer and min/max
        // scaledenominator (i.e. remove all attribute filters)
        var simpleRule = {};
        var symbolizerCount = 0;
        var zoomModified = false;

        // Use 'let' to create closure for imageLoadedCallback below
        let symbol = {};

        for (const field of Object.keys(rule)) {
            if (field.indexOf('scaledenominator') > 0) {
                symbol[field] = rule[field];
                zoomModified = true;
            } else if (field.indexOf('symbolizer') > 0 &&
                field !== 'textsymbolizer') {
                simpleRule[field] = rule[field];
                symbolizerCount++;
            }
        }

        if (symbolizerCount) {
            symbol.label = rule.name || 'No label';
            const symbolFts = { rules: [simpleRule] };
            const symbolStyleFn = SLDReader.createOlStyleFunction(symbolFts, {

                // When any external graphics for layer symbology finally loads,
                // update layer and symbol canvases in Layer Switcher / Legend
                imageLoadedCallback: function() {
                    // Update symbology canvases now external graphics loaded
                    // Note Layer Switcher and Legend symbols may be different size
                    if (symbol.layerSwitcherCanvas || symbol.legendCanvas) {
                        if (symbol.layerSwitcherCanvas) {
                            const newSymbolCanvas = createSymbol(
                                lyrSwiSymbolSizing, symbol.symbolStyleFn,
                                exampleFeature, realResolution);
                            const oldCanvas = symbol.layerSwitcherCanvas;
                            oldCanvas.parentNode.replaceChild(
                                newSymbolCanvas, oldCanvas);
                        }
                        if (symbol.legendCanvas) {
                            const newSymbolCanvas = createSymbol(
                                legendSymbolSizing, symbol.symbolStyleFn,
                                exampleFeature, realResolution);
                            const oldCanvas = symbol.legendCanvas;
                            oldCanvas.parentNode.replaceChild(
                                newSymbolCanvas, oldCanvas);
                        }
                    }

                    // Update map layer
                    layerDef.olLayer.changed();
                }
            });

            // Set the OpenLayers olStyle function for this layer.
            // If custom "tweakOlStyle" function defined, use it to modify the
            // output olStyle for things not possible to define in
            // "featureTypeStyle" itself.
            var olStyleFn;
            if (typeof tweakOlStyle !== 'function') {
                olStyleFn = symbolStyleFn;
            } else {
                olStyleFn = function (feature, realResolution) {
                    var olStyle = symbolStyleFn(feature, realResolution);
                    olStyle = tweakOlStyle(symbolFts, olStyle,
                        layerDef.styleName, feature, realResolution, true,
                        true, symbol.label);
                    return olStyle;
                };
            }
            symbol.symbolStyleFn = olStyleFn;
            symbol.id = symbolIdCount.toString();
            symbolIdCount++;

            // TBD: do something for forceSingleSymbol to combine zoomModified
            //      (might require combining min/max scale ranges)
            if (zoomModified && !layerDef.forceSingleSymbol) {
                symbol.zoomModified = true;
                zoomModifySymbolInfo.push({
                    //label: symbol.label || '[Layer]'+layerDef.label, // (debug only)
                    id: symbol.id,
                    minscaledenominator: (symbol.minscaledenominator || 0),
                    maxscaledenominator: (symbol.maxscaledenominator || Infinity)
                });
            }
            symbols.push(symbol);
        }
    }
    if (!symbols.length) {
        layerDef.symbologyType = 'noSymbol';
    } else {
        layerDef.symbols = symbols;
        if (multiSymbol) {
            layerDef.symbologyType = 'multiSymbol';
        } else {
            layerDef.symbologyType = 'singleSymbol';
        }
    }
}

/**
 * See if any tables defined in dataLayersConfig are still missing. Called
 * initially by checkForMissingData(), then recursively for each layer group
 * @param {object[]} groupLayerDefs - layer definition for layer group
 * @returns {boolean} true if data tables missing
 */
function checkGroupForMissingData(groupLayerDefs) {
    var tablesMissing = false;

    for (const layerDef of groupLayerDefs) {
        if (typeof layerDef.group !== 'undefined') {
            // Recurse for layer group
            if (checkGroupForMissingData(layerDef.group)) {
                tablesMissing = true;
            }
        } else {
            const olLayer = layerDef.olLayer;
            if (olLayer.getSource() === null) {
                tablesMissing = true;
                console.error('No data table found of name: "' + layerDef.table +
                    '" (layer: "' + layerDef.label + '")');
                // For LayerSwitcher with symbols
                // "(Loading...)" replaced with "(No Data)"
                const layerLoadingElem = document.getElementById(
                    'layer-loading-' + layerDef.id);
                layerLoadingElem.className = "no-layer-data";

                // For simple layerSwitcher without symbology, ensure
                // "(Loading...)" replaced with "(No Data)" on redraw
                const layerTitle = '<span class="no-layer-data"></span>' +
                    layerDef.label;
                olLayer.set('title', layerTitle);
            }
        }
    }
    return tablesMissing;
}
