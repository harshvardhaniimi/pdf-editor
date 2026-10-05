const engine=import('./engine-core.js');
let chain=Promise.resolve();
self.onmessage=({data:{id,action,arg}})=>{chain=chain.then(async()=>{try{const {execute}=await engine;const result=await execute(action,arg);const transfers=result instanceof Uint8Array?[result.buffer]:result?.data instanceof Uint8Array?[result.data.buffer]:[];self.postMessage({id,result},transfers);}catch(e){self.postMessage({id,error:e.message||String(e)});}});};
