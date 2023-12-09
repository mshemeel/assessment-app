import React, { useState,useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, GeoJSON, useMap,Marker, Popup, } from 'react-leaflet';
import toGeoJSON from 'togeojson'; 
import 'leaflet/dist/leaflet.css';
import JSZip from 'jszip';

function App() {  
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [isEmpty, setIsEmpty] = useState(true); // Track whether the input field is empty
  const [markerPosition, setMarkerPosition] = useState(null);
  //const [shpFileData, setShapeFileData] = useState(null);
  const test = "https://raw.githubusercontent.com/mshemeel/test-data-files/main/layer.zip";
  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setIsEmpty(newUrl === ''); // Update isEmpty state based on the input field value
    if (newUrl === '') {
      setData(null);
      setMarkerPosition(null);
    } 
  };

  const fetchData = async () => {
    try {
      
      if (url.toLowerCase().endsWith('.json')) {
        const response = await axios.get(url);
        setData(response.data);
        const coordinates = response.data.features[0].geometry.coordinates;
        setMarkerPosition([coordinates[1], coordinates[0]]);
      }  else if (url.toLowerCase().endsWith('.kml')) {
         const response = await axios.get(url);
         const kmlData = response.data;
         const domParser = new DOMParser();
         const kmlDocument = domParser.parseFromString(kmlData, 'application/xml'); 
         const geojsonData = toGeoJSON.kml(kmlDocument);
         const coordinates = geojsonData.features[0].geometry.coordinates;
        setMarkerPosition([coordinates[1], coordinates[0]]);
        setData(geojsonData);
      }  else if (url.toLowerCase().endsWith('.zip')) {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
        });  
          const formData = new FormData();
          const zipBlob = new Blob([response.data]);
          formData.append('upload', zipBlob, 'filename.zip');
        const postResponse = await axios.post('https://ogre.adc4gis.com/convert', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }); 
        console.log('POST response:', postResponse.data); 
        const geojsonData = postResponse.data;
        const coordinates = geojsonData.features[0].geometry.coordinates;
        setMarkerPosition([coordinates[1], coordinates[0]]);
        setData(geojsonData); 
      }else if (url.toLowerCase().endsWith('.kmz')) {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
        });  
        const zip = await JSZip.loadAsync(response.data);
        const kmlFile = zip.file(/\.kml$/)[0];
        if (kmlFile) {
          const kmlFile = Object.values(zip.files)[0];
          const kmlText = await kmlFile.async('text');
          const domParser = new DOMParser();
          const kmlDocument = domParser.parseFromString(kmlText, 'application/xml'); 
          const geojsonData = toGeoJSON.kml(kmlDocument);
          const coordinates = geojsonData.features[0].geometry.coordinates;
          setMarkerPosition([coordinates[1], coordinates[0]]);
          setData(geojsonData);
        }

      } else{
        console.error('Unsupported file format. Please provide a GeoJSON or KML URL.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }; 

  const handleMapClick = (e) => {
    console.log('Clicked on map at:', e.latlng);
    setMarkerPosition([e.latlng.lat, e.latlng.lng]);
  };

  const GeoJSONComponent = ({ data }) => {
    const map = useMap();

    useEffect(() => {
      if (map && isEmpty) {
        map.setView([50, 50], 3);
      }else if (map && data) {
        const coordinates = data.features[0].geometry.coordinates;
        map.setView([coordinates[1], coordinates[0]]);
        map.setZoom(15);
      }else if (map && markerPosition) {
        map.setView(markerPosition, 15);
      } 
    }, [map, data]);
  
    return <GeoJSON data={data} />;
  };

  return ( 
    <div>
      <h1>GeoJSON/KML Mapper</h1>
      <div>
        <label>
          Enter GeoJSON/KML URL:
          <input type="text" value={url} onChange={handleUrlChange} />
        </label>
        <button onClick={fetchData}>Load Data</button>
      </div>
      <MapContainer
       center={[50,50]}
        zoom={3}
        style={{ height: '300px', width: '80%' }}
        onClick={handleMapClick}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
       {<GeoJSONComponent data={data} />}
       {markerPosition && (
          <Marker position={markerPosition}>
            <Popup>Your custom marker</Popup>
          </Marker>
        )}
    
      </MapContainer>
    </div>
  ); 
}

export default App;
