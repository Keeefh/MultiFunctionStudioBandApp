export  const audioFiles= import.meta.glob('../../assets/*/*.{mp3,wav,ogg}', {eager:true})


export const  getAudio=async()=>{

    const byKit={}
    const promises=[]//the promise array is just to show the live promises that happens, on the iteration

     for(const[Path,value] of Object.entries(audioFiles)){

       //this is too find the name// 
       const part= Path.split('/'); 
       const fileName=part[part.length-1];
       const kitName = part[part.length - 2]; // second-to-last = folder name
       const name = fileName.replace(/\.(mp3|wav|ogg)$/i, "")
       
       //collecy all onformation from audio files and sort it to each folder
       if(!byKit[kitName]) byKit[kitName]=[]
       
       promises.push(
          (async()=>{

              try{
                let src=value.default
                const response=await fetch(src)
                const fileObject=await response.blob();
                byKit[kitName].push({ name, src, fileObject });
                
              }

              catch(error){
                  console.log(`Error loading audio file ${Path}:`, error);
                  byKit[kitName].push({ name, src, fileObject:null })  
                }
            })()
        )
    }
  
  await Promise.all(promises);
  return byKit
  
         
} 