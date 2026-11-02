import test from 'node:test';
import assert from 'node:assert/strict';
import {fitGameViewport} from '../src/presentation/gameViewport.ts';
import {battleCanvasScale} from '../src/presentation/battleCanvas.ts';

test('rotated scenes fit their rotated bounds to the actual browser without a second letterbox',()=>{
 for(const [width,height,angle] of [[390,844,90],[900,1400,270],[1280,1024,0],[2560,1080,90]]){
  const host=fitGameViewport(width,height,angle);
  const expected=battleCanvasScale(width,height,angle);
  assert.ok(Math.abs(host.scale-expected)<1e-10,'one effective fit against the real viewport');
  assert.ok(Math.abs(host.width-(angle%180?1080:1920)*expected)<1e-8);
  assert.ok(Math.abs(host.height-(angle%180?1920:1080)*expected)<1e-8);
  assert.ok(Math.abs(host.left-(width-host.width)/2)<1e-8);
  assert.ok(Math.abs(host.top-(height-host.height)/2)<1e-8);
 }
});

test('the entire 1920x1080 composition fits either axis with centered letterboxing',()=>{
 assert.deepEqual(fitGameViewport(1920,1080),{scale:1,width:1920,height:1080,left:0,top:0});
 assert.deepEqual(fitGameViewport(1280,720),{scale:2/3,width:1280,height:720,left:0,top:0});
 assert.deepEqual(fitGameViewport(2560,1080),{scale:1,width:1920,height:1080,left:320,top:0});
 assert.deepEqual(fitGameViewport(1440,1080),{scale:.75,width:1440,height:810,left:0,top:135});
 assert.deepEqual(fitGameViewport(1080,1920),{scale:.5625,width:1080,height:607.5,left:0,top:656.25});
 assert.deepEqual(fitGameViewport(3840,2160),{scale:2,width:3840,height:2160,left:0,top:0});
});

test('zero, negative and non-finite viewport measurements do not leak invalid transforms',()=>{
 for(const [w,h] of [[0,0],[-1,100],[100,-1],[NaN,1080],[1920,Infinity]])
  assert.deepEqual(fitGameViewport(w,h),{scale:0,width:0,height:0,left:0,top:0});
});
