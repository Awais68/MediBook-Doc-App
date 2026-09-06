"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HomeIcon, PlusIcon, ClockIcon, CheckIcon, XIcon } from "lucide-react";
import DoctorDetailSheet from "./DoctorDetailSheet";
import { updateRequest } from "@/actions/requests";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import DoctorCard from "./DoctorCard";

export default function DoctorRequests({ requests, status }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState({
    type: null,
    requestId: null,
  });
  const [activeFilter, setActiveFilter] = useState(status);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleAction = (type, requestId) => {
    setSelectedAction({ type, requestId });
    setDialogOpen(true);
  };

  const confirmAction = async () => {
    if (selectedAction.type === "accept") {
      console.log("selectedAction=>", selectedAction);
      await updateRequest(selectedAction.requestId, "accepted");
    } else if (selectedAction.type === "reject") {
      console.log("selectedAction=>", selectedAction);
      await updateRequest(selectedAction.requestId, "rejected");
    }
    setDialogOpen(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (activeFilter) {
      params.set("status", activeFilter);
      params.set("page", "1");
      params.set("limit", "30");
    } else {
      params.delete("status");
    }
    replace(`${pathname}?${params.toString()}`);

    console.log("params=>", params);
  }, [activeFilter]);

  // const filteredRequests = requests.filter(
  //   (request) => activeFilter === "all" || request.status === activeFilter
  // );

  const renderRequestCard = (request) => (
    <DoctorCard
      key={request._id}
      request={request}
      isAdmin={true}
      onAccept={() => handleAction("accept", request._id)}
      onReject={() => handleAction("reject", request._id)}
    />
  );

  return (
    <>
      <div className="grid w-full gap-4 md:w-1/2 mx-auto grid-cols-4">
        <div
          className={`border-secondory cursor-pointer p-3 my-4 text-center border rounded ${
            activeFilter == "all" && "bg-primary text-center text-white"
          }`}
          value="all"
          onClick={() => setActiveFilter("all")}
        >
          All
        </div>
        <div
          className={`border-secondory cursor-pointer p-3 my-4 text-center border rounded ${
            activeFilter == "pending" && "bg-primary text-center text-white"
          }`}
          value="pending"
          onClick={() => setActiveFilter("pending")}
        >
          Pending
        </div>
        <div
          className={`border-secondory cursor-pointer p-3 my-4 text-center border rounded ${
            activeFilter == "accepted" && "bg-primary text-center text-white"
          }`}
          value="accepted"
          onClick={() => setActiveFilter("accepted")}
        >
          Accepted
        </div>
        <div
          className={`border-secondory cursor-pointer p-3 my-4 text-center border rounded ${
            activeFilter == "rejected" && "bg-primary text-center text-white"
          }`}
          value="rejected"
          onClick={() => setActiveFilter("rejected")}
        >
          Rejected
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {requests.map(renderRequestCard)}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {selectedAction.type} this doctor
              request?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
