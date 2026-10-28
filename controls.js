(function(root){
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const controlled=new Set(['Space','ControlLeft','ControlRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyA','KeyD','KeyX']);
  const caps={1:.25,2:.55,3:1};
  function syncControl(keys,event){
    if(event.ctrlKey===true)keys.add('Control');
    else if(event.ctrlKey===false){keys.delete('Control');keys.delete('ControlLeft');keys.delete('ControlRight');}
  }
  function keyDown(keys,event,gear){
    const alreadyDown=keys.has(event.code);syncControl(keys,event);
    if(!controlled.has(event.code))return {gear,handled:false};
    keys.add(event.code);
    if(event.code!=='ControlLeft'&&event.code!=='ControlRight')event.preventDefault?.();
    if(!event.repeat&&!alreadyDown){
      if(event.code==='ArrowUp')gear=clamp(gear+1,-1,3);
      if(event.code==='ArrowDown')gear=clamp(gear-1,-1,3);
    }
    return {gear,handled:true};
  }
  function keyUp(keys,event){keys.delete(event.code);syncControl(keys,event);}
  function clear(keys,touch){keys.clear();if(touch)touch.clear();}
  function command(throttle,gear,keys,touch,dt){
    dt=clamp(Number.isFinite(dt)?dt:0,0,.1);gear=clamp(Math.round(gear),-1,3);
    throttle=clamp(Number.isFinite(throttle)?throttle:0,-.4,1);touch=touch||new Set();
    const space=keys.has('Space');
    const reverseOverride=space&&(keys.has('Control')||keys.has('ControlLeft')||keys.has('ControlRight'));
    const effectiveGear=reverseOverride?-1:gear;
    const brake=keys.has('KeyX')||touch.has('slow');
    const accelerating=space||touch.has('fast');
    // Gear selection changes engine command; water-relative velocity keeps its inertia.
    if(effectiveGear===0)throttle=0;
    else if(effectiveGear>0)throttle=clamp(throttle,accelerating?-.4:0,caps[effectiveGear]);
    else if(!accelerating)throttle=Math.min(throttle,0);
    if(brake){const amount=dt*1.7;throttle=Math.abs(throttle)<=amount?0:throttle-Math.sign(throttle)*amount;}
    else if(accelerating){
      if(effectiveGear<0)throttle=Math.max(-.4,throttle-dt*.65);
      else if(effectiveGear>0)throttle=Math.min(caps[effectiveGear],throttle+dt*.65);
    }
    const rudder=((keys.has('KeyD')||keys.has('ArrowRight')||touch.has('right'))?1:0)-((keys.has('KeyA')||keys.has('ArrowLeft')||touch.has('left'))?1:0);
    return {throttle,rudder,brake,gear,effectiveGear,reverseOverride};
  }
  root.RiverControls={keyDown,keyUp,clear,command,gearLabel:gear=>gear<0?'R':gear===0?'N':String(gear)};
})(typeof window!=='undefined'?window:globalThis);
