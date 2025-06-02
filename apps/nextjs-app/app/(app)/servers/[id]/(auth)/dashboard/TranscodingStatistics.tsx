"use client";

import { TranscodingStatisticsResponse } from "@/lib/db/transcoding-statistics";
import { BitrateDistributionCard } from "./BitrateDistributionCard";
import { CodecUsageCard } from "./CodecUsageCard";
import { ContainerFormatCard } from "./ContainerFormatCard";
import { DirectnessCard } from "./DirectnessCard";
import { HardwareAccelerationCard } from "./HardwareAccelerationCard";
import { ResolutionStatisticsCard } from "./ResolutionStatisticsCard";
import { TranscodingReasonsCard } from "./TranscodingReasonsCard";

export const TranscodingStatistics = ({
  data,
}: {
  data: TranscodingStatisticsResponse;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DirectnessCard data={data.directness} />
      <TranscodingReasonsCard data={data.transcodingReasons} />
      <BitrateDistributionCard data={data.transcodingBitrate} />
      <CodecUsageCard
        audioCodecs={data.transcodingAudioCodec}
        videoCodecs={data.transcodingVideoCodec}
      />
      <ContainerFormatCard data={data.transcodingContainer} />
      <ResolutionStatisticsCard
        width={data.transcodingWidth}
        height={data.transcodingHeight}
      />
      <HardwareAccelerationCard
        data={data.transcodingHardwareAccelerationType}
      />

      {/* Audio Channels */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Audio Channels</CardTitle>
          <CardDescription>Audio channel configuration</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">
              {data.transcoding_audio_channels.avg?.toFixed(1) || "-"}
            </div>
            <div className="text-xl text-muted-foreground">
              Average Audio Channels
            </div>
            <div className="mt-6 flex justify-center gap-12">
              <div className="text-center">
                <div className="text-2xl font-semibold">
                  {data.transcoding_audio_channels.min || "-"}
                </div>
                <div className="text-sm text-muted-foreground">Min</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">
                  {data.transcoding_audio_channels.max || "-"}
                </div>
                <div className="text-sm text-muted-foreground">Max</div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <InfoIcon className="h-4 w-4" />
            Data from {data.transcoding_audio_channels.count} sessions
          </div>
        </CardFooter>
      </Card> */}
    </div>
  );
};
