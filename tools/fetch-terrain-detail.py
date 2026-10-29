"""Download the public USGS source used by build-terrain-detail.cjs.
Usage: python tools/fetch-terrain-detail.py ../terrain-detail-source
Requires numpy and Pillow. Source files are build inputs, not web assets.
"""
import sys, json, pathlib, urllib.parse, urllib.request, hashlib
import numpy as np
from PIL import Image
out=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '../terrain-detail-source')
out.mkdir(parents=True,exist_ok=True)
service='https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer'
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RiverPilot terrain source/2.4'}),timeout=60) as r:return r.read()
params={'f':'json','bbox':'673248.8122536675,3367418.4053410613,675148.8122536675,3372418.4053410613','bboxSR':26915,'imageSR':26915,'size':'950,2500','format':'tiff','pixelType':'F32','noData':-9999,'adjustAspectRatio':'false','interpolation':'RSP_BilinearInterpolation','renderingRule':json.dumps({'rasterFunction':'None'})}
url=service+'/exportImage?'+urllib.parse.urlencode(params)
meta=json.loads(get(url))
if 'error' in meta:raise RuntimeError(meta['error'])
meta.update({'sourceRequest':url,'worldBounds':[400,-3500,2300,1500]})
(out/'export.json').write_text(json.dumps(meta,indent=2))
data=get(meta['href']);(out/'elevation.tif').write_bytes(data)
array=np.asarray(Image.open(out/'elevation.tif'),dtype='<f4')
assert array.shape==(2500,950) and np.all(np.isfinite(array)) and np.all((array>-20)&(array<200)), 'Unexpected export dimensions, NoData, or elevations'
array.tofile(out/'elevation.f32')
geometry={'x':-91.1908,'y':30.4497,'spatialReference':{'wkid':4326}}
url=service+'/identify?'+urllib.parse.urlencode({'f':'json','geometry':json.dumps(geometry),'geometryType':'esriGeometryPoint','returnGeometry':'false','returnCatalogItems':'true','pixelSize':json.dumps({'x':2,'y':2,'spatialReference':{'wkid':26915}})})
catalog=json.loads(get(url))
if 'error' in catalog:raise RuntimeError(catalog['error'])
result={'request':url,'value':catalog.get('value'),'location':catalog.get('location'),'catalog':[f['attributes'] for f in catalog.get('catalogItems',{}).get('features',[])],'visibilities':catalog.get('catalogItemVisibilities')}
assert result['catalog'], 'No source catalog returned at the reference location'
(out/'catalog-verified.json').write_text(json.dumps(result,indent=2))
print(json.dumps({'samples':array.size,'sourceSHA256':hashlib.sha256(data).hexdigest(),'catalogItems':len(result['catalog'])}))
