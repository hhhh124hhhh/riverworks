const step=2;
const neighbors=[
  [-1,0],[1,0],[0,-1],[0,1],
  [-1,-1],[-1,1],[1,-1],[1,1]
];

function clearSegment(from,to,legal) {
  const count=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.65));
  for(let i=1;i<=count;i++){
    const x=from.x+(to.x-from.x)*i/count;
    const z=from.z+(to.z-from.z)*i/count;
    if(!legal(x,z))return false;
  }
  return true;
}

function insert(queue,node) {
  let low=0,high=queue.length;
  while(low<high){
    const middle=(low+high)>>1;
    if(queue[middle].priority>node.priority)low=middle+1;
    else high=middle;
  }
  queue.splice(low,0,node);
}

function approachPoint(end,legal) {
  if(legal(end.x,end.z))return end;
  for(let radius=1.3;radius<=4.2;radius+=.65){
    const candidates=[];
    for(let i=0;i<16;i++){
      const angle=i*Math.PI/8;
      const point={x:end.x+Math.sin(angle)*radius,z:end.z+Math.cos(angle)*radius};
      if(legal(point.x,point.z))candidates.push(point);
    }
    if(candidates.length)return candidates[0];
  }
  return null;
}

export function routeTo(start,end,legal) {
  const destination=approachPoint(end,legal);
  if(!destination)return null;
  if(clearSegment(start,destination,legal))return [destination];

  // Anchor the grid at the player so the first step starts on reachable ground.
  const origin={...start,gx:0,gz:0,key:0,cost:0,priority:0,parent:null};
  const queue=[origin];
  const best=new Map([[0,origin]]);
  while(queue.length){
    const node=queue.pop();
    if(best.get(node.key)!==node)continue;
    if(Math.hypot(node.x-destination.x,node.z-destination.z)<step*1.55&&clearSegment(node,destination,legal)){
      const path=[destination];
      for(let point=node;point.parent;point=point.parent)path.push(point);
      path.reverse();
      const waypoints=[];
      let previous=start;
      for(let i=0;i<path.length;){
        let next=i;
        while(next+1<path.length&&clearSegment(previous,path[next+1],legal))next++;
        previous=path[next];
        waypoints.push({x:previous.x,z:previous.z});
        i=next+1;
      }
      return waypoints;
    }
    for(const [dx,dz] of neighbors){
      const gx=node.gx+dx,gz=node.gz+dz,key=gx+gz*1024;
      const cost=node.cost+Math.hypot(dx,dz)*step;
      if(best.has(key)&&best.get(key).cost<=cost)continue;
      const x=start.x+gx*step,z=start.z+gz*step;
      const point={gx,gz,key,x,z,cost,parent:node,priority:cost+Math.hypot(x-destination.x,z-destination.z)*1.04};
      if(!clearSegment(node,point,legal))continue;
      best.set(key,point);
      insert(queue,point);
    }
  }
  return null;
}
