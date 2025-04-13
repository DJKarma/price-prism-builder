
import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateFloorPsfData, FloorPsfPoint } from "@/utils/floorPsfChart";

interface FloorPsfChartProps {
  floorRules: Array<{
    startFloor: number;
    endFloor: number;
    psfIncrement: number;
    jumpEveryFloor?: number;
    jumpIncrement?: number;
  }>;
  maxFloor?: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as FloorPsfPoint;
    return (
      <div className="bg-white p-3 border rounded shadow-md text-xs">
        <p className="font-semibold">{`Floor ${label}`}</p>
        <p className="text-blue-600">{`PSF Adjustment: +${data.psf.toFixed(2)}`}</p>
        {data.isJump && <p className="text-amber-600 font-medium">Jump Floor</p>}
      </div>
    );
  }

  return null;
};

const FloorPsfChart: React.FC<FloorPsfChartProps> = ({ floorRules, maxFloor = 50 }) => {
  const data = generateFloorPsfData(floorRules, maxFloor);
  
  // Find jump floors for special rendering
  const jumpPoints = data.filter(point => point.isJump);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cumulative Floor PSF Adjustment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="floor" 
                label={{ 
                  value: "Floor", 
                  position: "insideBottom", 
                  offset: -10 
                }}
              />
              <YAxis 
                label={{ 
                  value: "PSF Adjustment", 
                  angle: -90, 
                  position: "insideLeft", 
                  style: { textAnchor: "middle" } 
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="psf"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              
              {/* Mark jump floors with special dots */}
              {jumpPoints.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="psf"
                  stroke="transparent"
                  strokeWidth={0}
                  data={jumpPoints}
                  dot={{ 
                    stroke: "#f59e0b", 
                    strokeWidth: 2, 
                    r: 5, 
                    fill: "#f59e0b" 
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <span>PSF Adjustment</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <span>Jump Floor</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FloorPsfChart;
