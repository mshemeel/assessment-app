import React, { useState,useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, GeoJSON, useMap} from 'react-leaflet';
import toGeoJSON from 'togeojson'; 
import 'leaflet/dist/leaflet.css';
import JSZip from 'jszip';
import L from 'leaflet';

function App() {  
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [isEmpty, setIsEmpty] = useState(true); 


  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setIsEmpty(newUrl === ''); 
    if (newUrl === '') {
      setData(null);
     
    } 
  };

  const fetchData = async () => {
    try {
      
      if (url.toLowerCase().endsWith('.json')) {
        const response = await axios.get(url);
        setData(response.data);
      }  else if (url.toLowerCase().endsWith('.kml')) {
         const response = await axios.get(url);
         const kmlData = response.data;
         const domParser = new DOMParser();
         const kmlDocument = domParser.parseFromString(kmlData, 'application/xml'); 
         const geojsonData = toGeoJSON.kml(kmlDocument);
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
  };

  const GeoJSONComponent = ({ data }) => {
    const map = useMap();

    useEffect(() => {
      if (map && isEmpty) {
        map.setView([50, 50], 3);
      }else if (map && data) {
        const geojsonObject = L.geoJSON(data);
        map.fitBounds(geojsonObject.getBounds());
        map.setZoom(8);
        console.log(geojsonObject)
      }
      // This is for fixing the icon image
      delete L.Icon.Default.prototype._getIconUrl;
  
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
        iconUrl: require("leaflet/dist/images/marker-icon.png"),
        shadowUrl: require("leaflet/dist/images/marker-shadow.png")
      });

    }, [map, data]);


    return <GeoJSON data={data}/>;
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
      </MapContainer>
    </div>
  ); 
}

export default App;
