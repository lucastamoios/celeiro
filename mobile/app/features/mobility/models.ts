export type RideType = "walking" | "bicycle";

export type Ride = {
    company_id: number;
    created_at: string;
    distance_traveled: number;
    finish_time: string;
    geo_points: string;
    score_record_id: number;
    start_time: string;
    type: RideType;
    type_changed_from: RideType | null;
    updated_at: string;
    user_id: number;
    uuid: string;
};