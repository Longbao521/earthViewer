var earthViewer={
    indexViewer:function(){
        return new Cesium.Viewer('map', {
            // terrainProvider: terrainProvider,
            //需要进行可视化的数据源的集合
            animation: false, //是否显示动画控件
            shouldAnimate: true,
            homeButton: false, //是否显示Home按钮
            fullscreenButton: false, //是否显示全屏按钮
            baseLayerPicker: false, //是否显示图层选择控件
            geocoder: false, //是否显示地名查找控件
            timeline: false, //是否显示时间线控件
            sceneModePicker: false, //是否显示投影方式控件
            navigationHelpButton: false, //是否显示帮助信息控件
            infoBox: false, //是否显示点击要素之后显示的信息
            requestRenderMode: true, //启用请求渲染模式
            scene3DOnly: false, //每个几何实例将只能以3D渲染以节省GPU内存
            sceneMode: 3, //初始场景模式 1 2D模式 2 2D循环模式 3 3D模式  Cesium.SceneMode
            fullscreenElement: document.body, //全屏时渲染的HTML元素 暂时没发现用处     
        });       
    },
    setGeoder:function(){
        var geocoder = viewer.geocoder.viewModel;
    
	    var key = "0352249e0608cf1709ce368f6017c3ca";
        var geocode = function (viewModelTiandi) {         
 
            //天地图请求： http://api.tianditu.gov.cn/geocoder?ds={"keyWord":"延庆区北京市延庆区延庆镇莲花池村前街50夕阳红养老院"}&tk=您的密钥
            //{"msg":"ok","location":{"level":"地产小区","lon":"117.23608","lat":"31.83107"},"searchVersion":"4.8.0","status":"0"}
            var requestString = ' http://api.tianditu.gov.cn/geocoder?ds={keyWord:' + viewModelTiandi._searchText + '}&tk=' + key;
             
            return Cesium.loadJson(requestString)  //请求url获取json数据
                .then(function (results) {
                    console.log(viewModelTiandi);
                    //添加viewModelTiandi.entities
                    viewModelTiandi.entities = [];
                        var entity = {
                                id:results.location.level,
                                position: Cesium.Cartesian3.fromDegrees(results.location.lon, results.location.lat),
                                point: {
                                    show: true,
                                    color: Cesium.Color.SKYBLUE,
                                    pixelSize: 10,
                                    outlineColor: Cesium.Color.YELLOW,
                                    outlineWidth: 3
                                },
                                description: new Cesium.ConstantProperty(viewModelTiandi._searchText)
                        };                         
                        viewModelTiandi.entities.push(entity);
                            viewer.entities.add(entity);                      
                });
        };
        //重写_searchCommand
        geocoder._searchCommand = Cesium.createCommand(function () {
            if (geocoder.isSearchInProgress) {
                cancelGeocode(geocoder);
            } else {
                geocode(geocoder);
            }
        });
    },
    //去掉默认底图，加载谷歌影像
    loadGoogle:function(){
        const baseLayer=viewer.imageryLayers.get(0);
        if(viewer.imageryLayers.remove(baseLayer,false)){
                console.log("底图已移除")
        }
        const provider = new Cesium.UrlTemplateImageryProvider({
                url: "http://mt1.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}&s=Gali"
        });
        var GoogleLayer;
        if(!viewer.imageryLayers.contains(GoogleLayer)){
                GoogleLayer = viewer.imageryLayers.addImageryProvider(provider);
        }
    },
    //加载单张图片作为影像
    addImage:function(){
        const baseLayer=viewer.imageryLayers.get(0);
        if(viewer.imageryLayers.remove(baseLayer,false)){
                console.log("底图已移除")
        }
        const provider = new Cesium.WebMapServiceImageryProvider({
            url: 'http://172.21.252.88:8081/geoserver/Data/wms', 
            layers: 'Data:world',
            parameters: {
                service : 'WMS',
                format:'image/png',
                transparent: true,
            }
        }); 
        var WorldTif;
        if(!viewer.imageryLayers.contains(WorldTif)){
                GoogleLayer = viewer.imageryLayers.addImageryProvider(provider);
        }
    },
    //加载矢量
    loadPhasor:function(url,layer){
        const provider = new Cesium.WebMapServiceImageryProvider({
            url: url,
            layers: layer,
            parameters: {
                service : 'WMS',
                format:'image/png',
                transparent: true,
            }
        }); 
        return viewer.imageryLayers.addImageryProvider(provider);
    },
    removePhasor:function(layer){
        if(viewer.imageryLayers.contains(layer)){
            viewer.imageryLayers.remove(layer);
        }else{
            console.log("该矢量不在场景中");
        }
    },
    removeImage:function(){
        const baseLayer=viewer.imageryLayers.get(0);
        if(viewer.imageryLayers.remove(baseLayer,false)){
                console.log("底图已移除")
        };
    },
    //设置相机位置，坐标为右手笛卡尔坐标   
    setCamera: function (x, y, z, roll, pitch, heading) {
        function setInit() {
            viewer.camera.setView({
                destination: Cesium.Cartesian3.fromElements(x, y, z),
                orientation: {
                    heading: heading,
                    pitch: pitch,
                    roll: roll,
                }
            });
        };
        return setInit;
    },
    //得到相机信息
    getCameraInfo:function(){
        var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction(function (event) {
          var camera = viewer.scene.camera;
          console.log("相机状态：" + camera.positionWC + "(" + camera.roll + "," + camera.pitch + "," + camera.heading + ")");
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    },
    //禁止相机到地下，可能会导致无法靠近模型的情况
    notDown: function () {
        //相机的pitch值大于0则禁止球旋转操作
        var scene = viewer.scene;
        var canvas = viewer.canvas;
        var camera = viewer.camera;
        scene.screenSpaceCameraController.minimumZoomDistance = 100;
        viewer.clock.onTick.addEventListener(function () {
            setMinCamera();
        });
        var setMinCamera = function () {
            if (camera.pitch > 0) {
                scene.screenSpaceCameraController.enableTilt = false;
            }
        };

        //监控鼠标滚轮按下状态下移动鼠标事件，当鼠标向下移动的时候就允许地球旋转操作
        var startMousePosition;
        var mousePosition;
        var handler = new Cesium.ScreenSpaceEventHandler(canvas);
        handler.setInputAction(function (movement) {
            mousePosition = startMousePosition = Cesium.Cartesian3.clone(movement.position);
            handler.setInputAction(function (movement) {
                mousePosition = movement.endPosition;
                var y = mousePosition.y - startMousePosition.y;
                if (y > 0) {
                    scene.screenSpaceCameraController.enableTilt = true;
                }
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        }, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);
    },
    //去除entity
    removeEntity:function(obj){
        if(viewer.entities.contains(obj)){
            console.log("Entity存在场景中");
            viewer.entities.remove(obj);
        }else{
            console.log("Entity不存在场景中");
        }
    },
    //加载3DTiles，并设置位置姿态，位置为经纬度(单位角度)
    add3DTiles:function(url,lon,lat,height,roll,pitch,head,isColor=false){
        var tileset = new Cesium.Cesium3DTileset({
            url: url
        });
        var model = viewer.scene.primitives.add(tileset);
        tileset.readyPromise.then(function (argument) {
            var position = Cesium.Cartesian3.fromDegrees(lon, lat, height);
            var mat = Cesium.Transforms.eastNorthUpToFixedFrame(position);
            if(roll){
                var rotationX = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(roll)));
                Cesium.Matrix4.multiply(mat, rotationX, mat);
            }
            if(pitch){
                var rotationY = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(pitch)));
                Cesium.Matrix4.multiply(mat, rotationY, mat);
            }
            if(head){
                var rotationZ = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(head)));
                Cesium.Matrix4.multiply(mat, rotationZ, mat);
            }
            tileset._root.transform = mat;
            // viewer.flyTo(tileset);
        });
        if(isColor){
            tileset.tileVisible.addEventListener(tile => {
                var content = tile.content;
                // console.log(tile.parent);
                for (var i = 0, len = content.featuresLength; i < len; i++) {
                  var feature = content.getFeature(i); //
                  // console.log(feature);
                  var name = feature.getProperty('name');
                  if (name === undefined) {
                    name = feature.getProperty('id');
                  } 
                  switch(name){
                      case 'Mesh0':feature.color = new Cesium.Color(1,1,0);break;
                      case 'Mesh1':feature.color = new Cesium.Color(0.75,0.75,0.75);break;
                      case 'Mesh2':feature.color = new Cesium.Color(0.65,0.16,0.16);break;
                      case 'Mesh3':feature.color = new Cesium.Color(0.5,0,0.5);break;
                      case 'Mesh4':feature.color = new Cesium.Color(1,0,1);break;
                      case 'Mesh5':feature.color = new Cesium.Color(0,1,0);break;
                      case 'Mesh6':feature.color = new Cesium.Color(1,0,0);break;
                      case 'Mesh7':feature.color = new Cesium.Color(0.3,0.8,0);break;
                      case 'Mesh8':feature.color = new Cesium.Color(0.8,0,0.3);break;
                      case 'Mesh9':feature.color = new Cesium.Color(0,0.3,0.8);break;
                      case 'Mesh10':feature.color = new Cesium.Color(0.8,0.6,0);break;
                      case 'Mesh11':feature.color = new Cesium.Color(0.6,0.3,0.8);break;
                      case 'Mesh12':feature.color = new Cesium.Color(0.8,0.6,0);break;
                      case 'Mesh13':feature.color = new Cesium.Color(0,0.8,0.5);break;
                      case 'Mesh14':feature.color = new Cesium.Color(0.5,0.6,0.2);break;
                      default:console.log(name);break;
                  }
                }
              });
        }
        return model;
    },
    remove3DTiles:function(obj){
        if (viewer.scene.primitives.contains(obj)) {
            if (viewer.scene.primitives.remove(obj)) {
                console.log("数据已去除");
            }
        }
    },
    //对3DTiles中的瓦片进行样式调整，可根据自己模型的Id自行调整
    tileVisible:function(){
        tileset.tileVisible.addEventListener(tile => {
            var content = tile.content;
            // console.log(tile.parent);
            for (var i = 0, len = content.featuresLength; i < len; i++) {
              var feature = content.getFeature(i); //
              // console.log(feature);
              var name = feature.getProperty('name');
              if (name === undefined) {
                name = feature.getProperty('id');
              } 
    
              switch(name){
                  case 'Mesh1':feature.color = Cesium.Color.DARKGREY;break;
                  case 'Mesh2':feature.color = Cesium.Color.RED;break;
                  case 'Mesh3':feature.color = Cesium.Color.BLUE;break;
                  case 'Mesh4':feature.color = Cesium.Color.GREEN;break;
              }
            }
          });
    },
    //加载自定义的地形
    addTerrain:function(url){
        var terrainLayer = new Cesium.CesiumTerrainProvider({
            url: url,
            requestWaterMask: true,
            credit: 'http://www.bjxbsj.cn',
        });
        viewer.terrainProvider = terrainLayer;
    },
    //设置左键事件，得到点击点的经纬度坐标(角度为弧度)
    getLonLatInfoHandler: function () {
        let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction(function (event) {
            // 屏幕坐标转世界坐标——关键点
            var ellipsoid = viewer.scene.globe.ellipsoid;
            var cartesian = viewer.camera.pickEllipsoid(event.position, ellipsoid);
            //将笛卡尔坐标转换为地理坐标
            var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            //将弧度转为度的十进制度表示
            var lon = Cesium.Math.toDegrees(cartographic.longitude);
            var lat = Cesium.Math.toDegrees(cartographic.latitude);
            console.log("点击点的经纬度坐标为：" + lon + "," + lat);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    },
    //经纬度坐标互转
    convertLonLat:function(model,lng,lat,array){//model为转换方式，0为百度转火星（谷歌，高德），1为火星转百度，2为WGS84转火星,3为火星转WGS84,
        function transformlat(lng, lat) {
            var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
            ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
            ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
            ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
            return ret
        }
         
        function transformlng(lng, lat) {
            var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
            ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
            ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
            ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
            return ret
        }
         
        /**
         * 判断是否在国内，不在国内则不做偏移
         * @param lng
         * @param lat
         * @returns {boolean}
         */
        function out_of_china(lng, lat) {
            return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
        }

        var x_PI = 3.14159265358979324 * 3000.0 / 180.0;
        var PI = 3.1415926535897932384626;
        var a = 6378245.0;
        var ee = 0.00669342162296594323;
        
        var lonCon,latCon;
        switch(model){
            case 0:{
                var x_pi = 3.14159265358979324 * 3000.0 / 180.0;
                var x = lng - 0.0065;
                var y = lat - 0.006;
                var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
                var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
                array.push(z * Math.cos(theta),z * Math.sin(theta))
                break;
            }
            case 1:{
                var z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_PI);
                var theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_PI);
                array.push(z * Math.cos(theta) + 0.0065, z * Math.sin(theta) + 0.006);
                break;
            }
            case 2:{
                if (out_of_china(lng, lat)) {
                    array.push(lng,lat);
                }
                else {
                    var dlat = transformlat(lng - 105.0, lat - 35.0);
                    var dlng = transformlng(lng - 105.0, lat - 35.0);
                    var radlat = lat / 180.0 * PI;
                    var magic = Math.sin(radlat);
                    magic = 1 - ee * magic * magic;
                    var sqrtmagic = Math.sqrt(magic);
                    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
                    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
                    array.push(lng + dlng,lat + dlat)
                }
                break;
            }
            case 3:{
                if (out_of_china(lng, lat)) {
                    array.push(lng,lat);
                }
                else {
                    var dlat = transformlat(lng - 105.0, lat - 35.0);
                    var dlng = transformlng(lng - 105.0, lat - 35.0);
                    var radlat = lat / 180.0 * PI;
                    var magic = Math.sin(radlat);
                    magic = 1 - ee * magic * magic;
                    var sqrtmagic = Math.sqrt(magic);
                    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
                    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
                    mglat = lat + dlat;
                    mglng = lng + dlng;
                    array.push(lng * 2 - mglng,lat * 2 - mglat);
                }
                break;
            }
            case 4:{
                var x_pi = 3.14159265358979324 * 3000.0 / 180.0;
                var x = lng - 0.0065;
                var y = lat - 0.006;
                var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
                var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
                var gg_lng = z * Math.cos(theta);
                var gg_lat = z * Math.sin(theta);
                if (out_of_china(gg_lng, gg_lat)) {
                    array.push(gg_lng,gg_lat);
                }
                else {
                    var dlat = transformlat(gg_lng - 105.0, gg_lat - 35.0);
                    var dlng = transformlng(gg_lng - 105.0, gg_lat - 35.0);
                    var radlat = gg_lat / 180.0 * PI;
                    var magic = Math.sin(radlat);
                    magic = 1 - ee * magic * magic;
                    var sqrtmagic = Math.sqrt(magic);
                    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
                    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
                    mglat = gg_lat + dlat;
                    mglng = gg_lng + dlng;
                    array.push(gg_lng * 2 - mglng,gg_lat * 2 - mglat);
                }
                break;
            }
            default:
                window.alert("坐标数据转换模式错误");
        }
        return [lonCon,latCon];
    }, 
    //加载gltf，可支持动态gltf
    addGltf:function(){
        var entity = viewer.entities.add({
            position:Cesium.Cartesian3.fromDegrees(110.62898254394531, 40.02804946899414, 6.0),
            model:{
                uri:'http://172.21.252.88:8080/gltf/result11.gltf',
                scale:3000.0,
                runAnimations:true,
                clampAnimation:true,
            }
        });
        viewer.trackedEntity = entity;
        viewer.zoomTo(entity);
        return entity;
    },
    //加载GeoJSON
    addGeojson:function(url){
        var data;
        function daTaSourceIsShow(isDestory){
            if(isDestory){
                if(viewer.dataSources.contains(data)){
                    viewer.dataSources.remove(data,true);
                }else{
                    console.log("该dataSource不在场景中");
                }
            }
        }
        Cesium.GeoJsonDataSource.load(url, {
            stroke: Cesium.Color.RED,
            fill: new Cesium.Color(210/255,237/255,174/255).withAlpha(70/256),
            strokeWidth: 0.0
          }).then(dataSource => {
            viewer.dataSources.add(dataSource);
            // viewer.zoomTo(dataSource);
            data = dataSource;
            dataSource.entities.values.forEach(entity => {
              entity.polygon.material = Cesium.Color.BLUE.withAlpha(0.1);
              entity.polygon.outline=true;
              entity.polygon.outlineColor=Cesium.Color.RED;
            });
          });
          return daTaSourceIsShow;
    },
    //加载KML
    loadKML:function(url){
        try{
            const kmlOptions = {
                camera: viewer.scene.camera,
                canvas: viewer.scene.canvas,
                clampToGround: true
            }
            const kmlDataSource = new Cesium.KmlDataSource();
            cachePromise = kmlDataSource.load(url,kmlOptions);
            cachePromise.then(dataSource => {
                viewer.dataSources.add(dataSource).then(function(data){
                    viewer.clock.shouldAnimate = false;
                    var rider = dataSource.entities.getById('19019');
                    viewer.flyTo(rider).then(function(){
                        viewer.trackedEntity = rider;
                        viewer.selectedEntity = viewer.trackedEntity;
                        viewer.clock.multiplier = 3000000;
                        viewer.clock.shouldAnimate = true;
                    }); 
                });
                const entities = dataSource.entities.values;
                for(let i=0;i<entities.length;i++){
                    var entity = entities[i];
                    entity.point = new Cesium.PointGraphics({
                           color:Cesium.Color.RED,
                           pixelSize:10,
                    });
                    // entity.label={
                    //     text:entity.name,
                    //     pixelOffset: new Cesium.Cartesian2(0.0, -30),
                    // }
                }
            })
            
        }catch(e){
            console.log(e.message);
        }
    }
};