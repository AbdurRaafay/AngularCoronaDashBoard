import { Component, OnInit, ViewContainerRef, ComponentFactoryResolver, AfterViewInit, ViewChild, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { country_Names } from '../assets/data/worldData';
import * as L from 'leaflet';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit, AfterViewInit 
{
  title = 'AngularCoronaDashBoard';
  showOverlay: boolean = false;
  showAbout: boolean = false;
  showDashboard: boolean = true;

  linkselect: number = 0;
  isMobile: boolean = false;
  firstTime: boolean = true;
  World_Confirmed: number = 0;
  World_Recovered: number = 0;
  World_Deaths: number = 0;
  World_FatalityRate: number = 0;
  Region_Confirmed: number = 0;
  Region_Recovered: number = 0;
  Region_Deaths: number = 0;
  Region_FatalityRate: number = 0;

  country_names = country_Names;
  selected_country: any;

  initialStyle: any;
  mapJson: any;
  worldMapRef: L.Map;
  geoJSONLayer: L.GeoJSON;
  worldMapLegend: L.Control;
  gC: Array<number> = [5000000, 3000000, 500000, 100000, 80000, 50000, 20000, 10000];//grades confirmed
  gD: Array<number> = [100000, 60000, 40000, 20000, 10000, 5000, 1000, 500];//grades deaths
  gR: Array<number> = [1000000, 800000, 500000, 100000, 50000, 30000, 10000, 5000];//grades recovered

  country_total_timeseries_data: Array<any> = Array(300).fill([]);//There are 185 countries for which data is available

  countryStats: any;
  countryDailyStats: any;

  lineGraphTitle: string = '';
  lineGraphRef: any;
  canvasLineGraph: any;
  contextLineGraph: any;
  @ViewChild('worldLineGraph') lineGraphTemplateRef;
  linechartOptionsLogarithmic = {
    responsive: true, title: { display: false, text: "Corona Total Cases" }, legend: { display: true }, scales:
    {
      xAxes: [{ type: "time", time: { format: 'YYYY-MM-DD', tooltipFormat: 'll' }, scaleLabel: { display: false } }],
      yAxes: [{
        type: "logarithmic", ticks: 
        {
          min: 10,
          callback: function (value, index, values) 
          {
            if (value === 1000000) return "1M";
            if (value === 500000) return "500K";
            if (value === 100000) return "100K";
            if (value === 50000) return "50K";
            if (value === 10000) return "10K";
            if (value === 5000) return "5K";
            if (value === 1000) return "1K";
            if (value === 100) return "100";
            if (value === 10) return "10";
            if (value === 0) return "0";
            return null;
          },
          scaleLabel: { display: false, labelString: 'Daily Count' }
        }
      }]
    }
  };
  linechartOptionsLinear = {
    responsive: true, title: { display: false, text: "Corona Total Cases" }, legend: { display: true }, scales:
    {
      xAxes: [{ type: "time", time: { format: 'YYYY-MM-DD', tooltipFormat: 'll' }, scaleLabel: { display: false } }],
      yAxes: [{
        type: "linear", ticks: {
          min: 10,
          scaleLabel: { display: false, labelString: 'Daily Count' }
        }
      }]
    }
  };
  linechartData = {
    datasets: [
      { label: "Confirmed", data: [], fill: false, borderColor: 'black' },
      { label: "Deaths", data: [], fill: false, borderColor: 'red' },
      { label: "Recovered", data: [], fill: false, borderColor: 'green' }]
  };

  @ViewChild('comparisonComponentContainer', {read: ViewContainerRef}) comparisonContainer: ViewContainerRef;

  @ViewChild('worldMapDiv', { read: ViewContainerRef }) worldMapCntr: ViewContainerRef;
  wMPC: Array<string> = ['#FF0000', '#FF7B00', '#FFAF00', '#FFE400', '#E5FF00', '#B0FF00', '#7CFF00', '#00FF00'];// World map color palette red -> yellow -> green 

  top10DonutRef: any;
  canvasDonutElement: any;
  contextDonut: any;
  @ViewChild('worldTop10DonutGraph') top10DonutTemplateRef;
  worldTop10C: Array<any> = [];
  worldTop10D: Array<any> = [];
  worldTop10R: Array<any> = [];
  worldTop10CL: Array<any> = [];
  worldTop10DL: Array<any> = [];
  worldTop10RL: Array<any> = [];

  donutChartData = 
  {
    datasets: [{
      label: "", backgroundColor: ["#FF4136", "#FFDC00", "#FF851B",
        "#01FF70", "#3D9970", "#7FDBFF", "#001f3f", "#0074D9", "#7FDBFF", "#DDDDDD"], data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }],
    labels: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
  };

  constructor(private http: HttpClient, private viewContainerRef: ViewContainerRef, private cfr: ComponentFactoryResolver,
    private injector: Injector) {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var msg = "width: " + width + " height: " + height;
    var msg2 = "window width: " + width + " window height: " + height + " screen width: " + screen.width + " screen height: " + screen.height;
    // alert(msg2);
    if ((width > 300 && width < 420) && (height > 550 && height < 899)) {
      this.isMobile = true;
      console.log('Mobile Portrait');
    }
    else if ((width > 550 && width < 899) && (height > 300 && height < 420)) {
      this.isMobile = true;
      console.log('Mobile Landscape');
    }
    else if ((width > 760 && width < 1030) && (height > 1020 && height < 1400)) // iPad and iPad Pro Portrait
    {
      this.isMobile = false;
      console.log('iPad (Pro) Portrait');
    }
    else if ((width > 1020 && width < 1400) && (height > 760 && height < 1030)) // iPad and iPad Pro Landscape
    {
      this.isMobile = false;
      console.log('iPad (Pro) Landscape');
    }
    else 
    {
      this.isMobile = false;
      console.log('Screen');
    }
  }

  ngOnInit() 
  {
  }

  ngAfterViewInit() 
  {
      this.loadGeoJSON().subscribe(result => 
      { 
        this.mapJson = result;
        this.loadCoutriesData().subscribe(res => 
        {
          this.countryDailyStats = res;
          this.correctCountryNames();
          var worldConfirmed = 0, worldDeaths = 0, worldRecovered = 0;
          for (var j = 0; j < country_Names.length; j++)
          {
            var ind = country_Names[j][0];          
            if(this.countryDailyStats[country_Names[j][1]] === undefined)
            {
              this.mapJson.features[ind].properties.confirmed = 0;
              this.mapJson.features[ind].properties.deaths = 0;
              this.mapJson.features[ind].properties.recovered = 0;
            }
            else
            {
              var country = this.countryDailyStats[country_Names[j][1]];
              var len = country.length;
              this.mapJson.features[ind].properties.confirmed = country[len - 1].confirmed;
              this.mapJson.features[ind].properties.deaths = country[len - 1].deaths;
              this.mapJson.features[ind].properties.recovered = country[len - 1].recovered;
              worldConfirmed += country[len - 1].confirmed;
              worldDeaths += country[len - 1].deaths;
              worldRecovered += country[len - 1].recovered;
            }
          }
          this.initMap();
          this.initLineChart();
          this.World_Confirmed = worldConfirmed;
          this.World_Deaths = worldDeaths;
          this.World_Recovered = worldRecovered;
          this.World_FatalityRate = this.World_Deaths / this.World_Confirmed * 100;
          this.applyGeoJSON();
          this.updateWorldMap('confirmed');
          this.initTop10DonutChart();
          this.calculatetop10();
          this.setDonutChartDataSource({ value: 'confirmed' });
          this.onCountrySelected(country_Names[63]);//Germany 
        },
        error => { console.log(error); });
      },
      error => { console.log(error); });
  }

  loadGeoJSON(): Observable<any> 
  {
    let url = 'https://raw.githubusercontent.com/AbdurRaafay/MapsData/master/world.json';
    return this.http.get(url);
  }

  loadWorldSummaryData(): Observable<any> 
  {
    let url = 'https://api.covid19api.com/summary';
    return this.http.get(url);
  }

  initMap() 
  {
    this.worldMapRef = L.map('worldMapID', { center: [39.8282, -98.5795], zoom: 3 });
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: false });
    tiles.addTo(this.worldMapRef);
    this.addMapButtons();
    console.log('Map ready');
  }

  addMapButtons() 
  {
    let layerControlBtn = new L.Control({ position: "topright" });
    layerControlBtn.onAdd = map => 
    {
      let div = L.DomUtil.create('div', 'info legend');
      let labels: string;
      labels = '<div><button class="mapBtn" id="Confirmed">Confirmed</button><br><button class="mapBtn" id="Deaths">Deaths</button><br>\
      <button class="mapBtn" id="Recovered">Recovered</button><br></div>';
      div.innerHTML = labels;
      L.DomEvent.on(div, "click", this._click, this);
      return div;
    };
    layerControlBtn.addTo(this.worldMapRef);
  }

  _click(e) 
  {
    var source: string = e.target.id;
    if (source.includes('Confirmed'))
      this.updateWorldMap('confirmed');
    else if (source.includes('Deaths'))
      this.updateWorldMap('dead');
    else if (source.includes('Recovered'))
      this.updateWorldMap('recovered');
  }

  addMapLegend(grades: any, legenTitle: string, oldControl: L.Control): L.Control 
  {
    if (oldControl != null)// Remove old legend
    {
      this.worldMapRef.removeControl(oldControl);
    }

    let legend = new L.Control({ position: "bottomleft" });
    legend.onAdd = map => 
    {
      let div = L.DomUtil.create('div', 'info legend'),
        labels = [],
        from, to;
      labels.push('<div class = "worldMapLegendTitle">' + legenTitle + '</div>');
      for (var i = 0; i < grades.length; i++) 
      {
        from = grades[i];
        to = grades[i + 1];

        labels.push('<i style="background:' + this.wMPC[i] + '"></i> ' + from + (to ? '&ndash;' + to : '-0'));
      }
      div.innerHTML = labels.join('<br>');
      return div;
    };
    legend.addTo(this.worldMapRef);
    return legend;
  }

  applyGeoJSON() 
  {
    this.geoJSONLayer = L.geoJSON(this.mapJson).addTo(this.worldMapRef);
    let style = feature => {
      return { weight: 0, opacity: 1, color: "black", dashArray: "3", fillOpacity: 0 };
    };
    this.initialStyle = style;
    this.geoJSONLayer.setStyle(this.initialStyle);
  }

  getColor(d: number, gA): string 
  {
    return d > gA[0] ? this.wMPC[0] : d > gA[1] ? this.wMPC[1] : d > gA[2] ? this.wMPC[2] : d > gA[3] ? this.wMPC[3] : d > gA[4] ? this.wMPC[4] : d > gA[5] ? this.wMPC[5] :
      d > gA[6] ? this.wMPC[6] : this.wMPC[7];
  }

  updateWorldMap(optionStats: string) 
  {
    const style = feature => 
    {
      var desiredColor: string;
      if (optionStats === 'confirmed') 
      {
        desiredColor = this.getColor(feature.properties.confirmed, this.gC);
        this.worldMapLegend = this.addMapLegend(this.gC, 'Confirmed', this.worldMapLegend);
      }
      else if (optionStats === 'dead') 
      {
        desiredColor = this.getColor(feature.properties.deaths, this.gD);
        this.worldMapLegend = this.addMapLegend(this.gD, 'Deaths', this.worldMapLegend);
      }
      else if (optionStats === 'recovered') 
      {
        desiredColor = this.getColor(feature.properties.recovered, this.gR);
        this.worldMapLegend = this.addMapLegend(this.gR, 'Recovered', this.worldMapLegend);
      }
      return { weight: 2, opacity: 1, color: "black", dashArray: "3", fillOpacity: 0.7, fillColor: desiredColor };
    };
    this.geoJSONLayer.resetStyle(this.initialStyle);
    this.geoJSONLayer.setStyle(style);
  }

  initTop10DonutChart() 
  {
    this.canvasDonutElement = this.top10DonutTemplateRef.nativeElement;
    this.contextDonut = this.canvasDonutElement.getContext('2d');
    if (this.isMobile) 
    {
      this.top10DonutRef = new Chart(this.contextDonut, {
        type: 'doughnut', data: this.donutChartData, options: {
          responsive: true, title: { display: true, position: 'top', fontSize: 15, fontStyle: 'bold' }, legend: { display: false },
          animation: { animateScale: true, animateRotate: true },
        }
      });
    }
    else {
      this.top10DonutRef = new Chart(this.contextDonut, {
        type: 'doughnut', data: this.donutChartData, options: {
          responsive: true, title: { display: true, position: 'top', fontSize: 15, fontStyle: 'bold' }, legend: { position: 'bottom', labels: { fontSize: 12 } },
          animation: { animateScale: true, animateRotate: true },
        }
      });
    }
  }

  initLineChart() 
  {
    this.canvasLineGraph = this.lineGraphTemplateRef.nativeElement;
    this.contextLineGraph = this.canvasLineGraph.getContext('2d');
    this.lineGraphRef = new Chart(this.contextLineGraph, { type: 'line', data: this.linechartData, options: this.linechartOptionsLinear });
  }

  calculatetop10() 
  {
    var tempArray = [...this.mapJson.features];
    var confirmed = tempArray.sort((a, b) => { return b.properties.confirmed - a.properties.confirmed }).slice(0, 10);
    for (var i = 0; i < 10; i++) 
    {
      this.worldTop10C.push(confirmed[i].properties.confirmed);
      this.worldTop10CL.push(confirmed[i].properties.name);
    }

    var deaths = tempArray.sort((a, b) => { return b.properties.deaths - a.properties.deaths }).slice(0, 10);
    for (var i = 0; i < 10; i++) 
    {
      this.worldTop10D.push(deaths[i].properties.deaths);
      this.worldTop10DL.push(deaths[i].properties.name);
    }

    var recovered = tempArray.sort((a, b) => { return b.properties.recovered - a.properties.recovered }).slice(0, 10);
    for (var i = 0; i < 10; i++) 
    {
      this.worldTop10R.push(recovered[i].properties.recovered);
      this.worldTop10RL.push(recovered[i].properties.name);
    }
  }

  setDonutChartDataSource(dataSource) 
  {
    if (dataSource.value === 'confirmed') 
    {
      this.top10DonutRef.options.title.text = 'Top 10 Confirmed';
      for (var i = 0; i < 10; i++) 
      {
        this.top10DonutRef.data.datasets[0].data[i] = this.worldTop10C[i];
        this.top10DonutRef.data.labels[i] = this.worldTop10CL[i];
      }
    }
    else if (dataSource.value === 'dead') 
    {
      this.top10DonutRef.options.title.text = 'Top 10 Deaths';
      for (var i = 0; i < 10; i++) 
      {
        this.top10DonutRef.data.datasets[0].data[i] = this.worldTop10D[i];
        this.top10DonutRef.data.labels[i] = this.worldTop10DL[i];
      }
    }
    else if (dataSource.value === 'recovered') 
    {
      this.top10DonutRef.options.title.text = 'Top 10 Recovered';
      for (var i = 0; i < 10; i++) 
      {
        this.top10DonutRef.data.datasets[0].data[i] = this.worldTop10R[i];
        this.top10DonutRef.data.labels[i] = this.worldTop10RL[i];
      }
    }
    this.top10DonutRef.update();
  }

  setLink(choice: string) 
  {
    if (choice === 'dashboard') 
    {
      this.linkselect = 0;
      this.showAbout = false;
      this.showDashboard = true;
    }
    else if (choice === 'about') 
    {
      this.linkselect = 1;
      this.showAbout = true;
      this.showDashboard = false;
    }
  }

  onCountrySelected(cntry_name) 
  {
    this.selected_country = cntry_name[1];
    this.setCountryStats(cntry_name[0]);//0 is index in mapJSON
    this.updateTimeSeriesData(cntry_name[0]);
    this.worldMapRef.flyTo([this.mapJson.features[cntry_name[0]].properties.Latitude, this.mapJson.features[cntry_name[0]].properties.Longitude], 4);
  }

  setLineGraphYAxisType(dataSource) 
  {
    console.log(dataSource);
    if (dataSource.value === 'linear') 
    {
      this.lineGraphRef.options = this.linechartOptionsLinear;
    }
    else if (dataSource.value === 'logarithmic') 
    {
      this.lineGraphRef.options = this.linechartOptionsLogarithmic;
    }
    this.lineGraphRef.update();
  }

  redrawLineChart(countryIndex: number) 
  {
    var countryData = this.country_total_timeseries_data[countryIndex];
    var countryDataConfirmed = { label: "Confirmed", data: countryData[0], fill: false, borderColor: 'black' };
    var countryDataDeaths = { label: "Deaths", data: countryData[1], fill: false, borderColor: 'red' };
    var countryDataRecovered = { label: "Recovered", data: countryData[2], fill: false, borderColor: 'green' };
    this.lineGraphRef.data.datasets[0] = countryDataConfirmed;
    this.lineGraphRef.data.datasets[1] = countryDataDeaths;
    this.lineGraphRef.data.datasets[2] = countryDataRecovered;
    this.lineGraphRef.update();
    this.lineGraphTitle = 'Total cases ' + this.selected_country;
  }

  updateTimeSeriesData(countryIndex: number) 
  {
    var countryData = this.country_total_timeseries_data[countryIndex];
    var countryConfirmed: Array<any> = [];
    var countryDeaths: Array<any> = [];
    var countryRecovered: Array<any> = [];
    if (countryData.length > 0)//Data exist
    {
      console.log('Data exist');
      this.redrawLineChart(countryIndex);
    }
    else 
    {
      var country = this.countryDailyStats[this.selected_country];
      for (var i = 0; i < country.length; i++) 
      {
        var stat = country[i];
        countryConfirmed.push({ x: stat.date, y: stat.confirmed });
        countryDeaths.push({ x: stat.date, y: stat.deaths });
        countryRecovered.push({ x: stat.date, y: stat.recovered });
      }
      this.country_total_timeseries_data[countryIndex] = [countryConfirmed, countryDeaths, countryRecovered];
      this.redrawLineChart(countryIndex);
    }
  }

  setCountryStats(countryIndex: number) 
  {
    this.Region_Confirmed = this.mapJson.features[countryIndex].properties.confirmed;
    this.Region_Deaths = this.mapJson.features[countryIndex].properties.deaths;
    this.Region_Recovered = this.mapJson.features[countryIndex].properties.recovered;
    this.Region_FatalityRate = this.Region_Deaths / this.Region_Confirmed * 100;
  }

  correctCountryNames()
  {
    this.countryDailyStats['United States of America'] = this.countryDailyStats['US'];
    delete this.countryDailyStats['US'];
    this.countryDailyStats['Myanmar'] = this.countryDailyStats['Burma'];
    delete this.countryDailyStats['Burma'];
    this.countryDailyStats['Brunei Darussalam'] = this.countryDailyStats['Brunei'];
    delete this.countryDailyStats['Brunei'];
    this.countryDailyStats['Czech Republic'] = this.countryDailyStats['Czechia'];
    delete this.countryDailyStats['Czechia'];
    this.countryDailyStats['Côte d\'Ivoire'] = this.countryDailyStats['Cote d\'Ivoire'];
    delete this.countryDailyStats['Cote d\'Ivoire'];      
    this.countryDailyStats['Iran, Islamic Republic of'] = this.countryDailyStats['Iran'];
    delete this.countryDailyStats['Iran'];
    this.countryDailyStats['Holy See (Vatican City State)'] = this.countryDailyStats['Holy See'];
    delete this.countryDailyStats['Holy See'];
    this.countryDailyStats['Korea (South)'] = this.countryDailyStats['Korea, South'];
    delete this.countryDailyStats['Korea, South'];
    this.countryDailyStats['Lao PDR'] = this.countryDailyStats['Laos'];
    delete this.countryDailyStats['Laos'];
    this.countryDailyStats['Macedonia, Republic of'] = this.countryDailyStats['North Macedonia'];
    delete this.countryDailyStats['North Macedonia'];
    this.countryDailyStats['Republic of Kosovo'] = this.countryDailyStats['Kosovo'];
    delete this.countryDailyStats['Kosovo'];
    this.countryDailyStats['Russian Federation'] = this.countryDailyStats['Russia'];
    delete this.countryDailyStats['Russia'];
    this.countryDailyStats['Taiwan, Republic of China'] = this.countryDailyStats['Taiwan*'];
    delete this.countryDailyStats['Taiwan*'];
    this.countryDailyStats['Tanzania, United Republic of'] = this.countryDailyStats['Tanzania'];
    delete this.countryDailyStats['Tanzania'];
    this.countryDailyStats['Venezuela (Bolivarian Republic)'] = this.countryDailyStats['Venezuela'];
    delete this.countryDailyStats['Venezuela'];
  }

  loadCoutriesData(): Observable<any>  
  {
    let url = 'https://pomber.github.io/covid19/timeseries.json';
    return this.http.get(url);
  }
}
