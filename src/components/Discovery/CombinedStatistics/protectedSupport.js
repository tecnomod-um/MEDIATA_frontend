// Chernoff upper-tail p-values for sums of independent geometric differences.
// Benjamini-Hochberg selects supported numerical bins at 5% FDR. This is
// post-processing of released counts, not a change to the privacy mechanism.
export function geometricUpperTail(variances,count) {
  if(count<=0) return 1;
  const qs=variances.map(v=>v/(v+1+Math.sqrt(2*v+1)));
  let low=0,high=Math.min(...qs.map(q=>-Math.log(q)))*(1-1e-12);
  for(let iteration=0;iteration<60;iteration++) {
    const t=(low+high)/2;
    const derivative=qs.reduce((sum,q)=>{
      const a=q*Math.exp(t),b=q*Math.exp(-t);
      return sum+a/(1-a)-b/(1-b);
    },0);
    if(derivative<count)low=t;else high=t;
  }
  const t=(low+high)/2;
  const cumulant=qs.reduce((sum,q)=>sum+2*Math.log1p(-q)-Math.log1p(-q*Math.exp(t))-Math.log1p(-q*Math.exp(-t)),0);
  return Math.min(1,Math.exp(cumulant-count*t));
}

export function supportedBins(cells,variances) {
  const ordered=cells.map((count,index)=>({index,p:geometricUpperTail(variances,count)})).sort((a,b)=>a.p-b.p);
  let retained=0;
  ordered.forEach((item,index)=>{if(item.p<=.05*(index+1)/cells.length)retained=index+1;});
  return retained ? ordered.slice(0,retained).map(item=>item.index) : null;
}
