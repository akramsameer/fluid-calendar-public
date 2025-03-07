"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * TeamManagement component - SAAS-only feature
 * This component allows managing team members and permissions
 */
export default function TeamManagement() {
  const [team] = useState([
    { id: 1, name: "John Doe", email: "john@example.com", role: "Admin" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Member" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Member" },
  ]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Team Management</CardTitle>
        <CardDescription>
          Manage your team members and their permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {team.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  <AvatarImage
                    src={`https://avatar.vercel.sh/${member.email}`}
                  />
                </Avatar>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {member.role}
                </span>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          ))}
          <Button className="w-full">Add Team Member</Button>
        </div>
      </CardContent>
    </Card>
  );
}
