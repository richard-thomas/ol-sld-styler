// Define all Map base layers (return a single group)
/* eslint no-unused-vars: 1 */

import ol_layer_Group from 'ol/layer/Group';
import ol_layer_Tile from 'ol/layer/Tile';
import ol_source_TileWMS from 'ol/source/TileWMS';
import ol_source_XYZ from 'ol/source/XYZ';
import ol_source_OSM from 'ol/source/OSM';

/**
 * Create OpenLayers map base layers group
 * @param {boolean} hideAtStartup - turn off base layer at start up?
 * @param {boolean} foldAtStartup - close fold of base layers at start up?
 * @returns {ol_layer_Group} OpenLayers Group of base layers
 */
export default function (hideAtStartup, foldAtStartup) {
    const lyrStamenTonerLite = new ol_layer_Tile({
        title: 'Stamen Toner Lite',
        opacity: 0.35,
        source: new ol_source_XYZ({

                url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}@2x.png',
            attributions: [
            '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>',
            '&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a>',  // Required for Stamen styles
            '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>',
            '&copy; <a href="https://www.openstreetmap.org/about/" target="_blank">OpenStreetMap contributors</a>'
            ]
        })
    });

    const lyrOsmMapnik = new ol_layer_Tile({
        title: 'OpenStreetMap (Mapnik)',
        opacity: 0.45,
        source: new ol_source_OSM()
    });

    const lyrCompositeDTM1mHillshade2020 = new ol_layer_Tile({
        source: new ol_source_TileWMS(({
            url: 'https://environment.data.gov.uk/spatialdata/lidar-composite-digital-terrain-model-dtm-1m-2022/wms',
            attributions: '&copy; Environment Agency copyright and/or database right 2022. ' +
                'All rights reserved. ' +
                '<a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"' +
                ' target="_blank" title="Open Government Licence">OGL</a>',
            params: {
                "LAYERS": "1",
                "TILED": "true",
                "VERSION": "1.3.0"},
            })),
        title: 'DTM Hillshade (1m resolution, 2022)'
    });

    const lyrCompositeDSM1mHillshade2020 = new ol_layer_Tile({
        source: new ol_source_TileWMS(({
            url: 'https://environment.data.gov.uk/spatialdata/lidar-composite-digital-surface-model-last-return-dsm-1m-2022/wms',
            attributions: '&copy; Environment Agency copyright and/or database right 2020. ' +
                'All rights reserved. ' +
                '<a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"' +
                ' target="_blank" title="Open Government Licence">OGL</a>',
            params: {
                "LAYERS": "1",
                "TILED": "true",
                "VERSION": "1.3.0"},
            })),
        title: 'DSM Hillshade (1m resolution, 2022)'
    });

    // Layer Group: 'Environment Agency LiDAR'
    const layersEnvironmentAgencyLiDAR = [
        lyrCompositeDTM1mHillshade2020,
        lyrCompositeDSM1mHillshade2020];
    const group_EnvironmentAgencyLiDAR = new ol_layer_Group({
        layers: layersEnvironmentAgencyLiDAR,
        'fold': 'open',
        title: 'LiDAR Elevation (Environment Agency)'
    });

    // Layer Group: Contemporary Base Maps
    const layersContemporaryBasemaps = [
        lyrStamenTonerLite,
        lyrOsmMapnik];
    const group_ContemporaryBasemaps = new ol_layer_Group({
        layers: layersContemporaryBasemaps,
        'fold': 'open',
        title: 'Contemporary Base Maps'
    });

    // Set common base layer properties
    const baseLayersList = layersEnvironmentAgencyLiDAR.concat(
        layersContemporaryBasemaps);
    for (var lyr of baseLayersList) {
        lyr.setVisible(false);
        lyr.setProperties({
            'type': 'base'
        });
    }

    // Select single initially visible base layer
    lyrStamenTonerLite.setVisible(true);

    const baseGroupsList = [group_ContemporaryBasemaps,
        group_EnvironmentAgencyLiDAR];
    const groupBaseLayers = new ol_layer_Group({
        layers: baseGroupsList,
        'fold': 'open',
        title: 'Map Base Layer (select one):'
    });
    if (hideAtStartup) {
        groupBaseLayers.setVisible(false);
    }
    if (foldAtStartup) {
        groupBaseLayers.setProperties({'fold': 'close'});
    }
    return groupBaseLayers;
}