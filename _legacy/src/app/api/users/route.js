import connectDB from "@/lib/connectDB";
import { UserModal } from "@/lib/models/UserModal";

export async function POST(req) {
  await connectDB();
  try {
    const obj = await req.json();

    let newUser = await new UserModal({ ...obj });
    newUser = await newUser.save();

    return Response.json(
      {
        error: false,
        msg: "User Registered Successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (e) {
    return Response.json(
      {
        error: true,
        msg: "Something went wrong",
      },
      { status: 400 }
    );
  }
}

export async function GET(req) {
  await connectDB();
  const users = await UserModal.find();
  return Response.json(
    {
      error: false,
      msg: "User fetched Successfully",
      users,
    },
    { status: 200 }
  );
}

export async function PUT(req) {}

export async function DELETE(req) {}
